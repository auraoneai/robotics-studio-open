from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from robostudio_engine.adapters import detect_adapter, list_episodes
from robostudio_engine.clustering import FailureClusterer
from robostudio_engine.exports import HFHubExporter, IntakePacketExporter, LocalExporter, prepare_release_blockers
from robostudio_engine.hardware_decode import available_decode_backends
from robostudio_engine.index import SQLiteIndexManager, build_streaming_index
from robostudio_engine.plugins import load_plugin_manifest, validate_plugin_manifest
from robostudio_engine.runners import EmbodimentCardGenerator, FailureGalleryExporter, QualityGateRunner, RecoveryAnalyzer, ReviewKitValidator, VLAProbeRunner
from robostudio_engine.sensor_qa import SensorQARunner, write_sensor_qa_report
from robostudio_engine.thumbnails import ThumbnailWorkerPool


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "inspect":
        episodes = [episode.to_dict() for episode in list_episodes(args.dataset, args.adapter)]
        adapter_name = args.adapter or detect_adapter(Path(args.dataset)).name
        return _print({"adapter": adapter_name, "episode_count": len(episodes), "episodes": episodes})
    if args.command == "index":
        progress = (lambda event: print(json.dumps(event, sort_keys=True), flush=True)) if args.json_lines else None
        return _print(build_streaming_index(args.dataset, args.adapter, progress=progress))
    if args.command == "query":
        filters = {}
        if args.success:
            filters["success"] = args.success == "true"
        if args.format:
            filters["dataset_format"] = args.format
        manager = SQLiteIndexManager(args.dataset)
        try:
            return _print({"episodes": manager.query(filters=filters, limit=args.limit)})
        finally:
            manager.close()
    if args.command == "thumbs":
        return _print(ThumbnailWorkerPool(args.dataset, workers=args.workers).generate_many(list_episodes(args.dataset)))
    if args.command == "qa":
        report = SensorQARunner().run(list_episodes(args.dataset))
        if args.out:
            write_sensor_qa_report(report, args.out, args.format)
            return _print({"out": args.out, "finding_count": report["finding_count"]})
        if args.format == "markdown":
            sys.stdout.write(SensorQARunner().render_markdown(report))
            return 0
        return _print(report)
    if args.command == "cluster":
        clusterer = FailureClusterer(args.embedding, args.min_cluster_size, args.custom_encoder)
        clusters = clusterer.cluster(list_episodes(args.dataset))
        if args.out:
            clusterer.write_manifest(clusters, args.out)
            return _print({"out": args.out, "clusters": len(clusters)})
        return _print({"clusters": [cluster.to_dict() for cluster in clusters]})
    if args.command == "probe":
        runner = VLAProbeRunner()
        if args.stream:
            for event in runner.stream(args.episodes, policy=args.policy):
                print(json.dumps(event, sort_keys=True), flush=True)
            return 0
        result = runner.run(args.episodes, policy=args.policy)
        if args.out and isinstance(result, dict):
            Path(args.out).write_text(result.get("markdown") or json.dumps(result, indent=2, sort_keys=True), encoding="utf8")
        return _print(result)
    if args.command == "card":
        episodes = list_episodes(args.dataset)
        info = episodes[0].metadata.get("info", episodes[0].metadata.get("dataset", episodes[0].metadata)) if episodes else {}
        generator = EmbodimentCardGenerator()
        rendered = generator.render_markdown(generator.generate(info), hf_readme=args.hf_readme)
        if args.out:
            Path(args.out).write_text(rendered, encoding="utf8")
            return _print({"out": args.out})
        sys.stdout.write(rendered)
        return 0
    if args.command == "export":
        episodes = list_episodes(args.dataset)
        if args.to == "hf-hub":
            if not args.repo:
                raise SystemExit("--repo is required for --to hf-hub")
            return _print(HFHubExporter().export(episodes, args.repo, args.out, private=args.private))
        if args.to == "intake":
            return _print({"out": str(IntakePacketExporter().export(episodes, args.out))})
        return _print({"out": str(LocalExporter().export(episodes, args.out, args.to))})
    if args.command == "contribute-failure":
        exporter = FailureGalleryExporter()
        case = exporter.build_case(args.case_id, args.title, args.summary, args.expected_label, args.repro_command, args.episode_id)
        out = exporter.write_case(case, args.gallery_root)
        payload = {"case": str(out)}
        if args.preview_out:
            payload["preview"] = str(exporter.render_preview(Path(args.gallery_root) / "cases", args.preview_out))
        return _print(payload)
    if args.command == "decode-info":
        return _print({"backends": [backend.__dict__ for backend in available_decode_backends()]})
    if args.command == "quality-gates":
        return _print(QualityGateRunner().run(args.dataset, fail_on=args.fail_on))
    if args.command == "recovery":
        return _print(RecoveryAnalyzer().analyze(args.segments_jsonl))
    if args.command == "validate-review":
        episode = json.loads(Path(args.episode_json).read_text(encoding="utf8"))
        errors = ReviewKitValidator().validate_episode(episode)
        return _print({"valid": not errors, "errors": errors}, exit_code=1 if errors else 0)
    if args.command == "release-blockers":
        return _print({"out": str(prepare_release_blockers(args.out))})
    if args.command == "plugins":
        payload = json.loads(Path(args.manifest).read_text(encoding="utf8"))
        errors = validate_plugin_manifest(payload, Path(args.manifest).parent)
        if errors:
            return _print({"valid": False, "errors": errors}, exit_code=1)
        manifest = load_plugin_manifest(args.manifest)
        return _print({"valid": True, "manifest": manifest.to_dict()})
    if args.command == "smoke":
        episodes = list_episodes(args.dataset)
        qa_report = SensorQARunner().run(episodes)
        clusters = FailureClusterer(min_cluster_size=1).cluster(episodes)
        return _print({"episodes": len(episodes), "qa_findings": qa_report["finding_count"], "clusters": len(clusters)})
    raise SystemExit(f"unknown command: {args.command}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="robostudio")
    sub = parser.add_subparsers(dest="command", required=True)
    inspect = sub.add_parser("inspect")
    inspect.add_argument("dataset")
    inspect.add_argument("--adapter")
    index = sub.add_parser("index")
    index.add_argument("dataset")
    index.add_argument("--adapter")
    index.add_argument("--json-lines", action="store_true")
    query = sub.add_parser("query")
    query.add_argument("dataset")
    query.add_argument("--success", choices=["true", "false"])
    query.add_argument("--format")
    query.add_argument("--limit", type=int, default=100)
    thumbs = sub.add_parser("thumbs")
    thumbs.add_argument("dataset")
    thumbs.add_argument("--workers", type=int, default=4)
    qa = sub.add_parser("qa")
    qa.add_argument("dataset")
    qa.add_argument("--format", choices=["json", "markdown"], default="json")
    qa.add_argument("--out")
    cluster = sub.add_parser("cluster")
    cluster.add_argument("dataset")
    cluster.add_argument("--embedding", choices=["hash", "clip", "custom"], default="hash")
    cluster.add_argument("--custom-encoder")
    cluster.add_argument("--min-cluster-size", type=int, default=5)
    cluster.add_argument("--out")
    probe = sub.add_parser("probe")
    probe.add_argument("episodes")
    probe.add_argument("--policy", default="mock")
    probe.add_argument("--stream", action="store_true")
    probe.add_argument("--out")
    card = sub.add_parser("card")
    card.add_argument("dataset")
    card.add_argument("--out")
    card.add_argument("--hf-readme", action="store_true")
    export = sub.add_parser("export")
    export.add_argument("dataset")
    export.add_argument("--to", choices=["manifest", "lerobot", "rlds", "openx", "hdf5", "hf-hub", "intake"], default="manifest")
    export.add_argument("--out", required=True)
    export.add_argument("--repo")
    export.add_argument("--private", action="store_true")
    contribute = sub.add_parser("contribute-failure")
    contribute.add_argument("gallery_root")
    contribute.add_argument("--case-id", required=True)
    contribute.add_argument("--title", required=True)
    contribute.add_argument("--summary", required=True)
    contribute.add_argument("--expected-label", required=True)
    contribute.add_argument("--repro-command", required=True)
    contribute.add_argument("--episode-id", action="append", default=[])
    contribute.add_argument("--preview-out")
    sub.add_parser("decode-info")
    quality = sub.add_parser("quality-gates")
    quality.add_argument("dataset")
    quality.add_argument("--fail-on", default="high")
    recovery = sub.add_parser("recovery")
    recovery.add_argument("segments_jsonl")
    validate = sub.add_parser("validate-review")
    validate.add_argument("episode_json")
    blockers = sub.add_parser("release-blockers")
    blockers.add_argument("--out", required=True)
    plugins = sub.add_parser("plugins")
    plugins_sub = plugins.add_subparsers(dest="plugins_command", required=True)
    plugins_validate = plugins_sub.add_parser("validate")
    plugins_validate.add_argument("manifest")
    smoke = sub.add_parser("smoke")
    smoke.add_argument("dataset")
    return parser


def _print(payload: object, exit_code: int = 0) -> int:
    print(json.dumps(payload, indent=2, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
