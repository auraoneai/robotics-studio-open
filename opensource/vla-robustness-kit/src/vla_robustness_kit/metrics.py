from __future__ import annotations

from collections import Counter, defaultdict


def summarize(results: list[dict]) -> dict:
    by_family: dict[str, list[dict]] = defaultdict(list)
    for result in results:
        by_family[result["family"]].append(result)
    family_rates = {
        family: sum(1 for item in items if item["passed"]) / len(items)
        for family, items in by_family.items()
    }
    clusters = Counter(item["cluster"] for item in results if item["cluster"] != "none")
    return {
        "total": len(results),
        "pass_rate": sum(1 for item in results if item["passed"]) / len(results) if results else 0.0,
        "family_rates": family_rates,
        "clusters": dict(clusters),
    }


def recommendations(summary: dict) -> list[str]:
    recs: list[str] = []
    for family, rate in summary["family_rates"].items():
        if rate < 0.75:
            recs.append(f"Collect targeted {family} counterexamples and rerun before real-robot tests.")
    if summary["clusters"].get("metadata_missing_frame"):
        recs.append("Add embodiment-card coordinate-frame metadata before publishing the dataset.")
    return recs or ["No immediate follow-up collection recommended for this mock diagnostic."]

