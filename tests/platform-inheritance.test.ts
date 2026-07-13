import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const platformConstants = readFileSync(
  new URL("../packages/platform-contracts/src/constants.ts", import.meta.url),
  "utf8",
);
const platformRobotics = readFileSync(
  new URL("../packages/platform-contracts/src/robotics.ts", import.meta.url),
  "utf8",
);
const platformStyles = readFileSync(
  new URL("../packages/aura-ide-kit/src/styles.css", import.meta.url),
  "utf8",
);
const localPlatformContracts = readFileSync(new URL("../src/platformContracts.ts", import.meta.url), "utf8");
const studioState = readFileSync(new URL("../src/studio-state.ts", import.meta.url), "utf8");
const tauriCore = readFileSync(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
const captureScript = readFileSync(new URL("../scripts/capture_screenshots.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
  license: string;
};
const releaseManifest = JSON.parse(
  readFileSync(new URL("../release/release-manifest.json", import.meta.url), "utf8"),
) as { publication_status: string };
const tauriConfig = JSON.parse(
  readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
) as {
  version: string;
  identifier: string;
  app: { security: { csp: string } };
};

const canonicalCsp = platformConstants.match(/export const CANONICAL_CSP =\n  "([^"]+)";/)?.[1];
if (!canonicalCsp) throw new Error("Unable to read canonical CSP");

assert.equal(packageJson.version, "0.2.0");
assert.equal(packageJson.license, "MIT");
assert.equal(releaseManifest.publication_status, "macos-and-browser-published");
assert.equal(tauriConfig.version, "0.2.0");
assert.equal(tauriConfig.identifier, "ai.auraone.roboticsstudio");
assert.equal(tauriConfig.app.security.csp, canonicalCsp);

assert.match(localPlatformContracts, /ROBOTICS_PLATFORM_HOOKS/);
assert.match(localPlatformContracts, /source-build-unpublished/);
assert.match(localPlatformContracts, /attempted:\s*false/);
assert.match(localPlatformContracts, /configured:\s*false/);
assert.match(localPlatformContracts, /LocalDiagnosticEventBuffer/);
assert.match(localPlatformContracts, /createTauriKeychainApi/);
assert.match(localPlatformContracts, /ensureIntakeInstallSigningKeypair/);
assert.match(localPlatformContracts, /window\.__TAURI_INTERNALS__/);
assert.match(localPlatformContracts, /browser source build generates no key/);
assert.doesNotMatch(
  localPlatformContracts,
  /localStorage|sessionStorage|indexedDB|telemetryClient|fetch\(|send\(/i,
);
assert.match(studioState, /localDiagnosticBufferEnabled:\s*false/);
assert.match(studioState, /crashReportsOptIn:\s*false/);

assert.match(platformRobotics, /ROBOTICS_PLATFORM_HOOKS/);
assert.match(platformStyles, /\.aura-ide-icon-button:focus-visible/);

assert.match(tauriCore, /UnsupportedBinary/);
assert.match(tauriCore, /JsonManifest/);
assert.match(tauriCore, /JsonlEpisodes/);
assert.match(tauriCore, /network_transfer:\s*false/);
assert.match(tauriCore, /checksums\.sha256/);
assert.doesNotMatch(tauriCore, /index\.sqlite|SidecarPaths|DatasetFormat::Hdf5|DatasetFormat::RosBag/);

assert.match(captureScript, /"pnpm-lock\.yaml"/);
assert.match(captureScript, /fixtures\/sample-so101/);
assert.match(captureScript, /platform-contracts\/src/);
assert.match(captureScript, /platform-contracts\/dist\/robotics\.js/);
assert.match(captureScript, /Declared capture dependency is missing/);
assert.match(captureScript, /JSON\.stringify\(evidence\.fixtureInputs\)/);
assert.match(captureScript, /framePixelProfile/);

console.log("robotics-studio-open platform inheritance checks passed");
