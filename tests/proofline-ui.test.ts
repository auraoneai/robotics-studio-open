import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const captureScript = readFileSync(new URL("../scripts/capture_screenshots.mjs", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const vercel = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
) as {
  rewrites: Array<{ source: string; destination: string }>;
};
const legacyRedirect = readFileSync(new URL("../public/Robotics Studio.html", import.meta.url), "utf8");
const cask = readFileSync(new URL("../release/homebrew-cask.rb", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
  license: string;
  scripts: Record<string, string>;
};
const cargo = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const architecture = readFileSync(new URL("../docs/architecture.md", import.meta.url), "utf8");
const fixtureCard = readFileSync(new URL("../fixtures/sample-so101/DATASET_CARD.md", import.meta.url), "utf8");
const mediaProvenance = JSON.parse(
  readFileSync(new URL("../public/media/synthetic-workcell-provenance.json", import.meta.url), "utf8"),
) as {
  synthetic: boolean;
  files: Array<{ path: string; sha256: string }>;
};
const manifest = JSON.parse(readFileSync(new URL("../release/release-manifest.json", import.meta.url), "utf8")) as {
  version: string;
  publication_status: string;
  publication_blockers: string[];
  update_states: string[];
  required_release_evidence: string[];
};

assert.match(app, /data-pl-theme="light"/, "the global shell must be light-first");
assert.match(app, /ProoflineStatus/, "status communication must use the shared Proofline compatibility layer");
assert.match(app, /primaryViews/, "primary workflow modes must be explicit");
assert.match(app, /toolViews/, "probe and settings must live in tools");
assert.match(app, /sidebarOpen/, "compact navigation drawer state is required");
assert.match(app, /inspectorOpen/, "compact inspector drawer state is required");
assert.match(app, /mediaDark/, "media contrast must be independently controlled");
assert.match(app, /Browser-downloaded local ZIP/, "export must describe the actual local archive");
assert.match(app, /Timeline records/, "timeline visualizations need an ordered text alternative");
assert.match(app, /Failure cluster records/, "cluster visualizations need a table alternative");
assert.match(app, /No AuraOne account is required/, "first run must preserve the open local workflow");
assert.match(app, /createDatasetFromLocalFiles/, "browser-selected local datasets must be parsed");
assert.match(app, /requestAnimationFrame\(tick\)/, "playback must advance from a deterministic animation loop");
assert.match(app, /recomputeDeterministicClusters/, "cluster recomputation must be wired");
assert.match(app, /splitClusterRows/, "cluster splitting must be wired");
assert.match(app, /mergeClusterRows/, "cluster merging must be wired");
assert.match(app, /buildLocalEvidenceArchive/, "local ZIP evidence export must be generated");
assert.match(app, /useDialogFocusTrap/, "modal focus containment is required");
assert.match(app, /\.inert = modalOpen/, "modal background content must become inert");
assert.match(app, /Synthetic sample/, "synthetic provenance must be image-visible");
assert.match(app, /synthetic-workcell-front-v1\.webp/, "the review canvas must use the generated front sensor frame");
assert.match(app, /synthetic-workcell-wrist-v1\.webp/, "the review canvas must use the generated wrist sensor frame");
assert.match(app, /data-synthetic-source="repository-generated-media"/, "synthetic media provenance must remain machine-readable");
assert.doesNotMatch(app, /<svg className="synthetic-scene"/, "the illustrative sensor scene must not return");
assert.match(app, /dataset\.provenance\.label/, "imported provenance must remain distinct");
assert.match(app, /Local diagnostic event preview/, "settings must describe the in-memory diagnostic preview");
assert.match(app, /Archive signing/, "settings must disclose signing availability");
assert.match(
  app,
  /ensureRoboticsIntakeInstallSigningKeypair/,
  "settings must use the shared desktop intake identity bridge",
);
assert.match(app, /OS keychain/, "settings must name the desktop key storage boundary");
assert.match(
  app,
  /no key is generated or stored/,
  "the browser source-build signing boundary must remain explicit",
);
assert.doesNotMatch(app, /Engine ready|Network available|12,847|230 episodes|installed stable build|Version 0\.2\.1 is signed/, "unverified runtime and sample claims must not return");
assert.doesNotMatch(
  app,
  /private_key|public_key|generateEd25519Keypair|crypto\.subtle/,
  "the source UI must not generate or expose signing-key material",
);
assert.doesNotMatch(app, />Send to AuraOne Programs</, "hosted handoff must not be the global primary action");

assert.match(styles, /--pl-canvas:\s*#f5f7fa/, "Proofline canvas token is missing");
assert.match(styles, /\.media-dark \.sensor-preview/, "dark contrast must be bounded to media");
assert.match(styles, /grid-template-columns:\s*216px minmax\(0, 1fr\) 300px/, "desktop cockpit rail geometry is missing");
assert.match(styles, /\.evidence-viewport/, "the dominant evidence viewport is missing");
assert.match(styles, /\.review-dock/, "the stable review dock is missing");
assert.match(styles, /\.cluster-row/, "compact failure rows are missing");
assert.match(styles, /\.export-sequence/, "ordered export sequence styling is missing");
assert.match(styles, /@media \(max-width: 1180px\)/, "compact desktop breakpoint is missing");
assert.match(styles, /@media \(max-width: 760px\)/, "narrow browser breakpoint is missing");
assert.match(styles, /min-height:\s*44px/, "mobile controls must preserve a 44 px target");
assert.match(styles, /font-size:\s*28px;\s*line-height:\s*34px/, "desktop page titles must use the required geometry");
assert.match(styles, /font-size:\s*24px;\s*line-height:\s*30px/, "mobile page titles must use the required geometry");
assert.match(styles, /prefers-reduced-motion/, "reduced-motion support is required");
assert.match(styles, /forced-colors:\s*active/, "forced-colors support is required");
assert.doesNotMatch(styles, /font-size:\s*(?:9|10|11)px/, "visible metadata must not render below 12 px");
assert.doesNotMatch(styles, /text-transform:\s*uppercase/, "decorative uppercase metadata must not return");
assert.doesNotMatch(styles, /(?:linear|radial)-gradient/, "global and panel gradients must not return");
assert.doesNotMatch(styles, /backdrop-filter/, "glass blur must not return");
assert.doesNotMatch(styles, /--tone-pass|--tone-warn|--tone-fail/, "readiness tones must not bypass canonical semantic tokens");
assert.doesNotMatch(styles, /color-mix\([^)]*--pl-focus/, "focus rings must use a solid Proofline focus color");
assert.doesNotMatch(styles, /border-radius:\s*(?:9|1[0-9]|[2-9][0-9])px/, "ordinary UI radii must remain at or below 8 px");
assert.match(styles, /outline:\s*3px solid var\(--pl-focus\)/, "the visible focus ring must use the solid Proofline focus token");
assert.match(main, /@auraone\/aura-ide-kit\/styles\.css/, "the shared Aura IDE kit stylesheet must be imported");
assert.match(captureScript, /renderDependencySha256/, "capture evidence must record linked render dependencies");
assert.match(captureScript, /aura-ide-kit\/dist\/styles\.css/, "capture evidence must close over the built Aura IDE kit stylesheet");
assert.match(captureScript, /proofline-oss\/dist\/styles\.css/, "capture evidence must close over the built Proofline stylesheet");
assert.match(captureScript, /platform-contracts\/dist\/robotics\.js/, "capture evidence must close over platform-contract runtime code");
assert.match(captureScript, /fixtures\/sample-so101/, "capture evidence must close over the complete fixture");
assert.match(captureScript, /public\/media/, "capture evidence must close over bundled sensor media");
assert.match(captureScript, /"pnpm-lock\.yaml"/, "capture evidence must hash the standalone repository lock");
assert.match(captureScript, /Declared capture dependency is missing/, "missing capture inputs must fail verification");
assert.match(captureScript, /fullPage:\s*false/, "release screenshots must use the coherent browser viewport");
assert.doesNotMatch(captureScript, /clip:\s*\{/, "release screenshots must not use page-coordinate clips");
assert.match(captureScript, /readCaptureFrameProfile/, "capture verification must inspect rendered PNG edge pixels");
assert.match(captureScript, /black capture band/, "capture verification must reject black shell bands");
assert.match(captureScript, /transparent capture pixels/, "capture verification must reject transparent shell bands");
assert.match(index, /src\/main\.tsx/, "Vite must build the typed React application");
assert.match(index, /href="\/fonts\/proofline-brand\.css"/, "hosted browser edition must request the official font boundary");
assert.deepEqual(
  vercel.rewrites[0],
  {
    source: "/fonts/:path*",
    destination: "https://auraone.ai/fonts/:path*",
  },
  "hosted fonts must proxy through the canonical AuraOne marketing boundary",
);
assert.doesNotMatch(index, /text\/babel|react\.development|robotics\/robotics\.css/, "the legacy browser prototype must not ship");
assert.match(legacyRedirect, /window\.location\.replace\("\/"\)/, "the legacy named route must redirect to the canonical app");
assert.doesNotMatch(legacyRedirect, /text\/babel|react\.development|robotics\/robotics\.css/, "the redirect must not embed the legacy UI");
assert.match(cask, /version "0\.2\.0"/);
assert.match(cask, /PENDING_SIGNED_ARTIFACT_SHA256/, "unpublished Homebrew metadata must retain an explicit evidence placeholder");
assert.doesNotMatch(cask, /0\.1\.0/);

assert.equal(packageJson.version, "0.2.0");
assert.equal(packageJson.license, "MIT");
assert.match(packageJson.scripts.dev, /^vite /, "README and Tauri development must have a dev script");
assert.match(packageJson.scripts["precapture:evidence"], /platform:build/, "capture generation must rebuild linked render dependencies");
assert.match(cargo, /^version = "0\.2\.0"$/m);
assert.match(cargo, /^license = "MIT"$/m);
assert.match(readme, /96 deterministic synthetic metadata variants/);
assert.match(readme, /No CLI is shipped/);
assert.match(architecture, /does not\s+create SQLite indexes/);
assert.match(architecture, /does not invoke it for dataset parsing/);
assert.match(fixtureCard, /96 generated synthetic episode metadata variants/);
assert.match(fixtureCard, /30 Hz control/);
assert.equal(mediaProvenance.synthetic, true);
assert.equal(mediaProvenance.files.length, 2);
for (const file of mediaProvenance.files) {
  assert.match(file.path, /^synthetic-workcell-(?:front|wrist)-v1\.webp$/);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
}
assert.equal(manifest.version, "0.2.0");
assert.equal(manifest.publication_status, "macos-and-browser-published");
assert.ok(manifest.publication_blockers.length >= 4, "unpublished release blockers must be explicit");
for (const state of ["checking", "current", "available", "downloading", "ready-to-restart", "failed", "unsupported", "signature-invalid"]) {
  assert.ok(manifest.update_states.includes(state), `release manifest is missing updater state ${state}`);
}
for (const evidence of ["sha256", "signature_result", "notarization_result", "build_commit", "clean_install_result", "update_result"]) {
  assert.ok(manifest.required_release_evidence.includes(evidence), `release manifest is missing evidence ${evidence}`);
}

console.log("robotics-studio-open Proofline UI checks passed");
