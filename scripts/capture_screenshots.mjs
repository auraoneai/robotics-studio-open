import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { startOfficialStyleBoundary } from "../tools/official-style-boundary.mjs";

const CAPTURE_DATE = "2026-07-13";
const PRODUCT_ID = "robotics-studio";
const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = appRoot;
const websiteRoot = resolve(
  process.env.AURAONE_WEBSITE_ROOT ?? resolve(appRoot, "../auraone-website"),
);
const outputRoot = resolve(appRoot, "docs/captures/0.2.0");
const evidencePath = resolve(outputRoot, "capture-evidence.json");
const port = Number(process.env.ROBOTICS_STUDIO_CAPTURE_PORT ?? 4332);
const baseUrl = `http://127.0.0.1:${port}`;
const verifyOnly = process.argv.includes("--verify");
const officialStyleAssetRoot = resolve(
  process.env.AURAONE_OFFICIAL_STYLE_ASSET_ROOT ??
    resolve(appRoot, "../auraone-website/public/fonts"),
);
const officialStyleSource = "auraone-website/public/fonts";
const officialStylePackagePolicy =
  "No private font binary is copied into OSS source or distributable packages.";

const scenarios = [
  {
    id: "review",
    button: "Review",
    surfaceLabel: "Episode scrubber",
    filename: "screenshot-overview",
    alt: "Robotics Studio Open review cockpit showing a synthetic SO-101 front RGB scene, sensor health selectors, transport timeline, and episode decision controls.",
  },
  {
    id: "failures",
    button: "Failures",
    surfaceLabel: "Failure intelligence",
    filename: "screenshot-clusters",
    alt: "Robotics Studio Open Failure intelligence view showing 96-record Synthetic sample provenance and compact deterministic cluster rows with review, split, and merge controls.",
  },
  {
    id: "export",
    button: "Export",
    surfaceLabel: "Export",
    filename: "screenshot-export",
    alt: "Robotics Studio Open Export view showing Synthetic sample provenance, collapsed Source, Destination, and Scope summaries, real ZIP artifacts, confirmation, and the Confirm and export ZIP action.",
  },
];

const viewports = [
  { id: "desktop", width: 1440, height: 900, deviceScaleFactor: 2 },
  { id: "mobile", width: 390, height: 844, deviceScaleFactor: 2 },
];

const sourceInputs = [
  "index.html",
  "package.json",
  "playwright.config.ts",
  "public/media",
  "pnpm-lock.yaml",
  "public/Robotics Studio.html",
  "scripts/capture_screenshots.mjs",
  "scripts/generate_sample_fixture.mjs",
  "src",
  "tsconfig.json",
  "vite.config.ts",
  "tools/official-style-boundary.mjs",
];
const fixtureInputs = [
  "fixtures/sample-so101",
  "src/data.ts",
  "src/episodeParsing.ts",
];
const renderDependencyInputs = [
  "packages/aura-ide-kit/package.json",
  "packages/aura-ide-kit/src",
  "packages/aura-ide-kit/dist/index.js",
  "packages/aura-ide-kit/dist/styles.css",
  "packages/proofline-oss/package.json",
  "packages/proofline-oss/src",
  "packages/proofline-oss/dist/index.js",
  "packages/proofline-oss/dist/styles.css",
  "packages/platform-contracts/package.json",
  "packages/platform-contracts/src",
  "packages/platform-contracts/dist/index.js",
  "packages/platform-contracts/dist/robotics.js",
];
const captureMethod =
  "Playwright Chromium against the local Vite application; approved official stylesheet delivered through a temporary loopback private render boundary with no private font binaries in OSS source or packages; native viewport screenshot from a reset shell and internal scroll origin; reduced motion; animations and caret disabled; external network blocked; deterministic cwebp conversion.";
const syntheticProvenance =
  "Repository-owned synthetic SO-101 fixture containing 96 deterministic metadata variants generated from three documented seed scenes in fixtures/sample-so101. The bundled front and wrist sensor frames are generated photorealistic synthetic media with repository provenance. No customer, worker, personal, credential, endpoint secret, or sensitive source data is included, and no real robot recording is used.";

if (verifyOnly) {
  await verifyEvidence();
} else {
  await captureEvidence();
}

async function captureEvidence() {
  const packageJson = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
  if (packageJson.version !== "0.2.0") {
    throw new Error(`Expected ${PRODUCT_ID} 0.2.0, received ${packageJson.version}`);
  }

  const sourceState = await currentSourceState();
  const sourceContentSha256 = await digestInputs(sourceInputs);
  const syntheticFixtureSha256 = await digestInputs(fixtureInputs);
  const renderDependencySha256 = await digestInputs(renderDependencyInputs);
  const officialStyleBoundary = await officialStyleBoundaryEvidence();
  const captureSpecSha256 = captureSpecDigest(
    packageJson.version,
    officialStyleBoundary,
  );

  await mkdir(outputRoot, { recursive: true });
  const officialStyleServer = await startOfficialStyleBoundary({
    assetRoot: officialStyleAssetRoot,
  });
  const server = spawn(
    "pnpm",
    ["exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        NO_COLOR: "1",
        VITE_AURAONE_OFFICIAL_STYLE_URL:
          officialStyleServer.stylesheetUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk;
  });

  const records = [];
  try {
    await waitForServer(server);
    const browser = await chromium.launch();
    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: viewport.deviceScaleFactor,
          colorScheme: "light",
          reducedMotion: "reduce",
          locale: "en-US",
          timezoneId: "UTC",
        });
        await context.addInitScript(() => {
          window.localStorage.clear();
          window.sessionStorage.clear();
        });
        await context.route("**/*", async (route) => {
          const requestUrl = new URL(route.request().url());
          if (
            requestUrl.protocol === "data:" ||
            requestUrl.protocol === "blob:" ||
            requestUrl.hostname === "127.0.0.1" ||
            requestUrl.hostname === "localhost"
          ) {
            await route.continue();
          } else {
            await route.abort("blockedbyclient");
          }
        });
        for (const scenario of scenarios) {
          const page = await context.newPage();
          try {
            await page.goto(baseUrl, { waitUntil: "networkidle" });
            await waitForOfficialStyle(page);
            await page.getByRole("button", { name: "Explore sample" }).click();
            await page.addStyleTag({
              content:
                "html,body,#root,.app{background:#f5f7fa!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}",
            });
            if (viewport.id === "mobile") {
              await page.getByLabel("Workspace view").selectOption(
                scenario.id === "review" ? "scrub" : scenario.id === "failures" ? "clusters" : "export",
              );
            } else {
              await page
                .getByRole("complementary", { name: "Datasets and saved views" })
                .getByRole("button", { name: scenario.button, exact: true })
                .click();
            }
            await page
              .getByRole("region", { name: scenario.surfaceLabel, exact: true })
              .waitFor();
            await resetCaptureViewport(page);
            await assertCaptureViewport(page, viewport, scenario);

            const suffix = viewport.id === "mobile" ? ".mobile" : "";
            const localPng = resolve(
              outputRoot,
              `${scenario.filename}.${viewport.id}.png`,
            );
            const localWebp = resolve(
              outputRoot,
              `${scenario.filename}.${viewport.id}.webp`,
            );
            const websiteOutput = resolve(
              websiteRoot,
              `public/open/${PRODUCT_ID}/${scenario.filename}${suffix}.webp`,
            );

            await page.screenshot({
              path: localPng,
              animations: "disabled",
              caret: "hide",
              fullPage: false,
              omitBackground: false,
            });
            await convertToWebp(localPng, localWebp);
            await mkdir(dirname(websiteOutput), { recursive: true });
            await copyFile(localWebp, websiteOutput);

            const pngBytes = await readFile(localPng);
            const webpBytes = await readFile(localWebp);
            const dimensions = readPngDimensions(pngBytes);
            const framePixelProfile = readCaptureFrameProfile(pngBytes);
            assertCoherentCaptureFrame(framePixelProfile, `${scenario.id}/${viewport.id}`);
            const record = {
              id: `${PRODUCT_ID}-${scenario.id}-${viewport.id}`,
              scenario: scenario.id,
              variant: viewport.id,
              altOrCaption: scenario.alt,
              localPngOutput: relative(repoRoot, localPng),
              localWebpOutput: relative(repoRoot, localWebp),
              websiteOutput: relative(repoRoot, websiteOutput),
              viewport: {
                width: viewport.width,
                height: viewport.height,
                deviceScaleFactor: viewport.deviceScaleFactor,
              },
              dimensions,
              framePixelProfile,
              sourcePngSha256: sha256(pngBytes),
              sha256: sha256(webpBytes),
              fileSize: webpBytes.byteLength,
              format: "webp",
              captureMethod,
              syntheticProvenance,
            };
            if (viewport.id === "desktop") {
              const websiteSvgOutput = resolve(
                websiteRoot,
                `public/open/${PRODUCT_ID}/${scenario.filename}.svg`,
              );
              const svg = websiteCaptureSvg(scenario.alt, syntheticProvenance, webpBytes, dimensions);
              await writeFile(websiteSvgOutput, svg);
              record.websiteSvgOutput = relative(repoRoot, websiteSvgOutput);
              record.websiteSvgSha256 = sha256(svg);
            }
            records.push(record);
          } finally {
            await page.close();
          }
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${serverLog}`);
  } finally {
    server.kill("SIGTERM");
    await Promise.race([onceExit(server), delay(3_000)]);
    if (server.exitCode === null) server.kill("SIGKILL");
    await officialStyleServer.close();
  }

  const evidence = {
    schemaVersion: "auraone.local-product-capture.v3",
    productId: PRODUCT_ID,
    productVersion: packageJson.version,
    capturedAt: CAPTURE_DATE,
    captureEvidenceState: "verified-local",
    releaseState: "stale",
    releaseStateReason:
      "The captures verify the current local 0.2.0 source UI only. They do not verify a committed source snapshot, signed binary, installer, package-manager release, or updater artifact.",
    baseSourceCommit: sourceState.baseSourceCommit,
    sourceState: sourceState.state,
    sourceChangeCount: sourceState.changeCount,
    sourceChangeDigest: sourceState.changeDigest,
    sourceContentSha256,
    sourceInputs,
    syntheticFixtureSha256,
    fixtureInputs,
    renderDependencyInputs,
    renderDependencySha256,
    officialStyleBoundary,
    captureSpecSha256,
    captureMethod,
    syntheticProvenance,
    records,
  };
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  await verifyEvidence();
  console.log(`Captured and verified ${records.length} ${PRODUCT_ID} assets.`);
}

async function resetCaptureViewport(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const scrollingElement = document.scrollingElement;
    if (scrollingElement) {
      scrollingElement.scrollLeft = 0;
      scrollingElement.scrollTop = 0;
    }
    for (const element of document.querySelectorAll(
      ".app,.layout,.workarea,.surface,.sidebar,.right-rail,.table-scroll,.target-list",
    )) {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    }
  });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  await page.evaluate(() => document.fonts.ready);
  await delay(300);
}

async function assertCaptureViewport(page, viewport, scenario) {
  const geometry = await page.evaluate(() => {
    const app = document.querySelector(".app");
    const topbar = document.querySelector(".topbar");
    const surface = document.querySelector(".surface");
    if (!(app instanceof HTMLElement) || !(topbar instanceof HTMLElement) || !(surface instanceof HTMLElement)) {
      throw new Error("Capture shell elements are missing");
    }
    const appRect = app.getBoundingClientRect();
    const topbarRect = topbar.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const sidebar = document.querySelector(".sidebar");
    return {
      app: rectRecord(appRect),
      topbar: rectRecord(topbarRect),
      surface: rectRecord(surfaceRect),
      sidebar: sidebar instanceof HTMLElement ? rectRecord(sidebar.getBoundingClientRect()) : null,
      documentWidth: document.documentElement.scrollWidth,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };

    function rectRecord(rect) {
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }
  });

  const tolerance = 1;
  assert(Math.abs(geometry.scrollX) <= tolerance, `${scenario.id}/${viewport.id} horizontal scroll origin is offset`);
  assert(Math.abs(geometry.scrollY) <= tolerance, `${scenario.id}/${viewport.id} vertical scroll origin is offset`);
  assert(Math.abs(geometry.app.left) <= tolerance, `${scenario.id}/${viewport.id} app is offset from the left viewport edge`);
  assert(Math.abs(geometry.app.top) <= tolerance, `${scenario.id}/${viewport.id} app is offset from the top viewport edge`);
  assert(geometry.app.width >= viewport.width - tolerance, `${scenario.id}/${viewport.id} app does not span the viewport`);
  assert(Math.abs(geometry.topbar.left) <= tolerance, `${scenario.id}/${viewport.id} shell header is clipped on the left`);
  assert(Math.abs(geometry.topbar.top) <= tolerance, `${scenario.id}/${viewport.id} shell header is clipped on the top`);
  assert(geometry.topbar.right >= viewport.width - tolerance, `${scenario.id}/${viewport.id} shell header does not span the viewport`);
  assert(geometry.surface.left >= -tolerance, `${scenario.id}/${viewport.id} content surface is clipped on the left`);
  assert(geometry.surface.top >= geometry.topbar.bottom - tolerance, `${scenario.id}/${viewport.id} content surface overlaps the shell header`);
  assert(geometry.surface.right <= viewport.width + tolerance, `${scenario.id}/${viewport.id} content surface exceeds the viewport`);
  assert(geometry.documentWidth <= viewport.width, `${scenario.id}/${viewport.id} document overflows horizontally`);

  if (viewport.id === "desktop") {
    assert(geometry.sidebar, `${scenario.id}/desktop navigation rail is missing`);
    assert(Math.abs(geometry.sidebar.left) <= tolerance, `${scenario.id}/desktop navigation rail is clipped on the left`);
    assert(geometry.sidebar.top >= geometry.topbar.bottom - tolerance, `${scenario.id}/desktop navigation rail overlaps the shell header`);
    assert(geometry.sidebar.width >= 208 && geometry.sidebar.width <= 224, `${scenario.id}/desktop navigation rail width is outside 208-224 px`);
  }

  if (scenario.id === "review") {
    const review = await page.evaluate(() => {
      const activeSensor = document.querySelector(".sensor-option[aria-selected='true']");
      const viewportElement = document.querySelector(".evidence-viewport");
      const dock = document.querySelector("[data-testid='review-dock']");
      const decision = document.querySelector("[aria-label='Episode decision']");
      if (!(activeSensor instanceof HTMLElement) || !(viewportElement instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(decision instanceof HTMLElement)) {
        throw new Error("Review capture targets are missing");
      }
      const surface = document.querySelector(".surface");
      if (!(surface instanceof HTMLElement)) throw new Error("Review surface is missing");
      return {
        activeSensorSelected: activeSensor.getAttribute("aria-selected"),
        activeSensorText: activeSensor.textContent,
        evidence: rectRecord(viewportElement.getBoundingClientRect()),
        dock: rectRecord(dock.getBoundingClientRect()),
        decision: rectRecord(decision.getBoundingClientRect()),
        surface: rectRecord(surface.getBoundingClientRect()),
        syntheticLabel: document.body.textContent?.includes("Synthetic repository evidence"),
      };

      function rectRecord(rect) {
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }
    });
    assert(review.activeSensorSelected === "true", `${scenario.id}/${viewport.id} active sensor is not selected`);
    assert(review.activeSensorText?.includes("RGB camera"), `${scenario.id}/${viewport.id} active sensor type/health is not visible`);
    assert(review.syntheticLabel, `${scenario.id}/${viewport.id} synthetic review provenance is missing`);
    assert(review.evidence.left >= review.surface.left - tolerance && review.evidence.right <= review.surface.right + tolerance, `${scenario.id}/${viewport.id} evidence viewport is clipped`);
    assert(review.dock.left >= review.surface.left - tolerance && review.dock.right <= review.surface.right + tolerance, `${scenario.id}/${viewport.id} review dock is clipped`);
    assert(review.dock.bottom <= viewport.height + tolerance, `${scenario.id}/${viewport.id} review dock is outside the capture`);
    assert(review.decision.bottom <= viewport.height + tolerance, `${scenario.id}/${viewport.id} decision path is outside the capture`);
  }

  if (scenario.id === "failures") {
    const failures = await page.evaluate(() => {
      const surface = document.querySelector(".surface");
      const provenance = document.querySelector("[aria-label='Dataset provenance']");
      const cards = [...document.querySelectorAll("[data-testid='failure-card']")];
      if (!(surface instanceof HTMLElement) || !(provenance instanceof HTMLElement) || cards.length !== 3) {
        throw new Error("Failure capture targets are missing");
      }
      const captureBottom = Math.min(window.innerHeight, surface.getBoundingClientRect().bottom);
      return {
        provenanceText: provenance.textContent,
        cards: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          const controlsOutside = [...card.querySelectorAll("button")].some((control) => {
            const controlRect = control.getBoundingClientRect();
            return controlRect.left < rect.left || controlRect.right > rect.right || controlRect.top < rect.top || controlRect.bottom > rect.bottom;
          });
          const mediaOutside = [...card.querySelectorAll(".sensor-preview")].some((media) => {
            const mediaRect = media.getBoundingClientRect();
            return mediaRect.left < rect.left || mediaRect.right > rect.right || mediaRect.top < rect.top || mediaRect.bottom > rect.bottom;
          });
          return {
            bottom: rect.bottom,
            top: rect.top,
            text: card.textContent,
            width: card.clientWidth,
            scrollWidth: card.scrollWidth,
            controlsOutside,
            mediaOutside,
          };
        }),
        captureBottom,
      };
    });
    assert(failures.provenanceText?.includes("Synthetic sample"), `${scenario.id}/${viewport.id} synthetic provenance is missing`);
    assert(failures.cards.every((card) => card.scrollWidth <= card.width && !card.controlsOutside && !card.mediaOutside), `${scenario.id}/${viewport.id} failure card content is clipped`);
    assert(failures.cards.every((card) => card.top >= 0 && card.bottom <= failures.captureBottom + tolerance), `${scenario.id}/${viewport.id} capture cuts a failure card`);
    assert(failures.cards.every((card) => card.text?.includes("SO-101")), `${scenario.id}/${viewport.id} fixture embodiment evidence is missing`);
  }

  if (scenario.id === "export") {
    const exportGeometry = await page.evaluate(() => {
      const provenance = document.querySelector("[aria-label='Dataset provenance']");
      const artifacts = document.querySelector("[data-export-step='artifacts']");
      const confirmation = document.querySelector("[data-export-step='confirmation']");
      const cta = document.querySelector(".export-cta");
      const steps = [...document.querySelectorAll("[data-export-step]")];
      if (!(provenance instanceof HTMLElement) || !(artifacts instanceof HTMLElement) || !(confirmation instanceof HTMLElement) || !(cta instanceof HTMLElement)) {
        throw new Error("Export capture targets are missing");
      }
      return {
        provenanceText: provenance.textContent,
        order: steps.map((element) => element.getAttribute("data-export-step")),
        artifacts: rectRecord(artifacts.getBoundingClientRect()),
        confirmation: rectRecord(confirmation.getBoundingClientRect()),
        cta: rectRecord(cta.getBoundingClientRect()),
        surfaceScrollHeight: geometryFor(surfaceFrom(cta)).scrollHeight,
        surfaceClientHeight: geometryFor(surfaceFrom(cta)).clientHeight,
        collapsedCompletedSteps: ["source", "destination", "scope"].every((step) => !document.querySelector(`[data-export-step='${step}']`)?.classList.contains("expanded")),
      };

      function surfaceFrom(element) {
        const surface = element.closest(".surface");
        if (!(surface instanceof HTMLElement)) throw new Error("Export surface is missing");
        return surface;
      }

      function geometryFor(element) {
        return { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
      }

      function rectRecord(rect) {
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }
    });
    assert(exportGeometry.provenanceText?.includes("Synthetic sample"), `${scenario.id}/${viewport.id} synthetic provenance is missing`);
    assert(JSON.stringify(exportGeometry.order) === JSON.stringify(["source", "destination", "scope", "artifacts", "confirmation"]), `${scenario.id}/${viewport.id} export sequence is out of order`);
    assert(exportGeometry.artifacts.left >= geometry.surface.left - tolerance && exportGeometry.artifacts.right <= geometry.surface.right + tolerance, `${scenario.id}/${viewport.id} artifacts are clipped`);
    assert(exportGeometry.confirmation.left >= geometry.surface.left - tolerance && exportGeometry.confirmation.right <= geometry.surface.right + tolerance, `${scenario.id}/${viewport.id} confirmation is clipped`);
    assert(exportGeometry.cta.bottom <= viewport.height + tolerance, `${scenario.id}/${viewport.id} primary local export action is outside the capture`);
    if (viewport.id === "mobile") {
      assert(exportGeometry.collapsedCompletedSteps, "export/mobile completed steps must collapse to summaries");
      assert(exportGeometry.artifacts.top >= geometry.surface.top - tolerance, "export/mobile artifacts begin above the content viewport");
      assert(exportGeometry.surfaceScrollHeight <= exportGeometry.surfaceClientHeight + tolerance, "export/mobile requires internal vertical scrolling");
    }
  }
}

async function verifyEvidence() {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const packageJson = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
  const sourceState = await currentSourceState();
  const officialStyleBoundary = await officialStyleBoundaryEvidence();
  assert(evidence.schemaVersion === "auraone.local-product-capture.v3", "Unexpected capture schema");
  assert(evidence.productId === PRODUCT_ID, "Unexpected product id");
  assert(evidence.productVersion === "0.2.0", "Unexpected product version");
  assert(evidence.capturedAt === CAPTURE_DATE, "Unexpected capture date");
  assert(evidence.captureEvidenceState === "verified-local", "Capture must be verified-local");
  assert(evidence.releaseState === "stale", "Release state must remain stale");
  assert(
    await isAncestorCommit(
      evidence.baseSourceCommit,
      sourceState.baseSourceCommit,
    ),
    "Recorded capture base is not an ancestor of current HEAD",
  );
  assert(evidence.sourceState === "dirty-uncommitted", "Expected explicit dirty-uncommitted state");
  assert(evidence.sourceState === sourceState.state, "Recorded source state no longer matches");
  assert(
    JSON.stringify(evidence.sourceInputs) === JSON.stringify(sourceInputs),
    "Source input closure changed",
  );
  assert(
    evidence.sourceContentSha256 === (await digestInputs(sourceInputs)),
    "Source content digest is stale",
  );
  assert(
    JSON.stringify(evidence.fixtureInputs) === JSON.stringify(fixtureInputs),
    "Fixture input closure changed",
  );
  assert(
    evidence.syntheticFixtureSha256 === (await digestInputs(fixtureInputs)),
    "Synthetic fixture digest is stale",
  );
  assert(
    JSON.stringify(evidence.renderDependencyInputs) === JSON.stringify(renderDependencyInputs),
    "Render dependency input closure changed",
  );
  assert(
    evidence.renderDependencySha256 === (await digestInputs(renderDependencyInputs)),
    "Linked Aura IDE kit or Proofline render dependency digest is stale",
  );
  assert(
    JSON.stringify(evidence.officialStyleBoundary) ===
      JSON.stringify(officialStyleBoundary),
    "Official style boundary digest or policy drifted",
  );
  assert(
    evidence.captureSpecSha256 ===
      captureSpecDigest(packageJson.version, officialStyleBoundary),
    "Capture specification digest is stale",
  );
  assert(evidence.records.length === scenarios.length * viewports.length, "Unexpected record count");

  for (const record of evidence.records) {
    const pngPath = resolve(repoRoot, record.localPngOutput);
    const webpPath = resolve(repoRoot, record.localWebpOutput);
    const websitePath = resolve(repoRoot, record.websiteOutput);
    const pngBytes = await readFile(pngPath);
    const webpBytes = await readFile(webpPath);
    const websiteBytes = await readFile(websitePath);
    assert(sha256(pngBytes) === record.sourcePngSha256, `${record.id} PNG hash mismatch`);
    assert(sha256(webpBytes) === record.sha256, `${record.id} WebP hash mismatch`);
    assert(sha256(websiteBytes) === record.sha256, `${record.id} website hash mismatch`);
    assert(
      JSON.stringify(readPngDimensions(pngBytes)) === JSON.stringify(record.dimensions),
      `${record.id} PNG dimensions mismatch`,
    );
    const framePixelProfile = readCaptureFrameProfile(pngBytes);
    assertCoherentCaptureFrame(framePixelProfile, record.id);
    assert(
      JSON.stringify(framePixelProfile) === JSON.stringify(record.framePixelProfile),
      `${record.id} frame pixel profile mismatch`,
    );
    assert(
      JSON.stringify(readWebpDimensions(webpBytes)) === JSON.stringify(record.dimensions),
      `${record.id} WebP dimensions mismatch`,
    );
    assert(webpBytes.byteLength === record.fileSize, `${record.id} file size mismatch`);
    if (record.websiteSvgOutput) {
      const svgBytes = await readFile(resolve(repoRoot, record.websiteSvgOutput));
      assert(sha256(svgBytes) === record.websiteSvgSha256, `${record.id} website SVG hash mismatch`);
    }
  }
  console.log(`Verified ${evidence.records.length} ${PRODUCT_ID} capture records.`);
}

async function currentSourceState() {
  const baseSourceCommit = (await run("git", ["rev-parse", "HEAD"], repoRoot)).trim();
  const status = await run(
    "git",
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      ".",
      ":(exclude)docs/captures",
    ],
    repoRoot,
  );
  const changes = status.split(/\r?\n/).filter(Boolean).sort();
  return {
    baseSourceCommit,
    state: changes.length > 0 ? "dirty-uncommitted" : "clean",
    changeCount: changes.length,
    changeDigest: sha256(changes.join("\n")),
  };
}

async function isAncestorCommit(baseCommit, headCommit) {
  try {
    await run(
      "git",
      ["merge-base", "--is-ancestor", baseCommit, headCommit],
      repoRoot,
    );
    return true;
  } catch {
    return false;
  }
}

async function digestInputs(inputs) {
  const files = [];
  for (const input of inputs) {
    const absolute = resolve(appRoot, input);
    try {
      const info = await stat(absolute);
      if (info.isDirectory()) {
        await collectFiles(absolute, files);
      } else if (info.isFile()) {
        files.push(absolute);
      }
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`Declared capture dependency is missing: ${input}`);
      }
      throw error;
    }
  }
  if (!files.length) throw new Error("Capture dependency closure resolved to no files.");
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    hash.update(relative(repoRoot, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function captureSpecDigest(productVersion, officialStyleBoundary) {
  return sha256(
    JSON.stringify({
      productId: PRODUCT_ID,
      productVersion,
      scenarios,
      viewports,
      captureMethod,
      syntheticProvenance,
      sourceInputs,
      fixtureInputs,
      renderDependencyInputs,
      officialStyleBoundary,
    }),
  );
}

async function officialStyleBoundaryEvidence() {
  return {
    source: officialStyleSource,
    sha256: await digestInputs([officialStyleAssetRoot]),
    delivery: "temporary loopback server",
    packagePolicy: officialStylePackagePolicy,
  };
}

async function collectFiles(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "target", "captures"].includes(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(absolute, files);
    if (entry.isFile()) files.push(absolute);
  }
}

async function convertToWebp(input, output) {
  await run(
    process.env.CWEBP_BIN ?? "cwebp",
    ["-quiet", "-q", "88", "-m", "6", "-metadata", "none", input, "-o", output],
    appRoot,
  );
}

async function waitForServer(server) {
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server has not bound its port yet.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function waitForOfficialStyle(page) {
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.auraoneOfficialStyle === "loaded",
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--pl-official-font-ui")
        .trim().length > 0,
  );
  await page.evaluate(() => document.fonts.ready);
}

function readPngDimensions(bytes) {
  assert(bytes.toString("ascii", 1, 4) === "PNG", "Invalid PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readCaptureFrameProfile(bytes) {
  const decoded = decodePngScanlines(bytes);
  const bands = {
    top: { dark: 0, transparent: 0, total: 0 },
    right: { dark: 0, transparent: 0, total: 0 },
    bottom: { dark: 0, transparent: 0, total: 0 },
    left: { dark: 0, transparent: 0, total: 0 },
  };
  const topEnd = Math.max(1, Math.floor(decoded.height * 0.05));
  const rightStart = decoded.width - Math.max(1, Math.floor(decoded.width * 0.05));
  const bottomStart = decoded.height - Math.max(1, Math.floor(decoded.height * 0.03));
  const leftEnd = Math.max(1, Math.floor(decoded.width * 0.05));
  let previous = Buffer.alloc(decoded.stride);
  let dataOffset = 0;

  for (let y = 0; y < decoded.height; y += 1) {
    const filter = decoded.data[dataOffset];
    dataOffset += 1;
    const row = Buffer.from(decoded.data.subarray(dataOffset, dataOffset + decoded.stride));
    dataOffset += decoded.stride;
    unfilterPngRow(row, previous, filter, decoded.bytesPerPixel);

    for (let x = 0; x < decoded.width; x += 1) {
      const pixelOffset = x * decoded.bytesPerPixel;
      const red = row[pixelOffset];
      const green = row[pixelOffset + 1];
      const blue = row[pixelOffset + 2];
      const alpha = decoded.bytesPerPixel === 4 ? row[pixelOffset + 3] : 255;
      const dark = alpha > 0 && red <= 16 && green <= 16 && blue <= 16;
      const transparent = alpha < 250;

      if (y < topEnd) countPixel(bands.top, dark, transparent);
      if (x >= rightStart) countPixel(bands.right, dark, transparent);
      if (y >= bottomStart) countPixel(bands.bottom, dark, transparent);
      if (x < leftEnd) countPixel(bands.left, dark, transparent);
    }
    previous = row;
  }

  return {
    colorType: decoded.colorType,
    edgeDarkRatio: ratiosFor(bands, "dark"),
    edgeTransparentRatio: ratiosFor(bands, "transparent"),
  };
}

function decodePngScanlines(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Invalid PNG signature");
  let offset = 8;
  let header;
  const compressed = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  assert(header, "PNG header is missing");
  assert(header.bitDepth === 8, `Unsupported PNG bit depth ${header.bitDepth}`);
  assert([2, 6].includes(header.colorType), `Unsupported PNG color type ${header.colorType}`);
  assert(header.compression === 0 && header.filter === 0 && header.interlace === 0, "Unsupported PNG encoding");
  assert(compressed.length > 0, "PNG image data is missing");
  const bytesPerPixel = header.colorType === 6 ? 4 : 3;
  const stride = header.width * bytesPerPixel;
  const data = inflateSync(Buffer.concat(compressed));
  assert(data.length === (stride + 1) * header.height, "Unexpected PNG scanline length");
  return { ...header, bytesPerPixel, stride, data };
}

function unfilterPngRow(row, previous, filter, bytesPerPixel) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const above = previous[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    if (filter === 1) row[index] = (row[index] + left) & 0xff;
    else if (filter === 2) row[index] = (row[index] + above) & 0xff;
    else if (filter === 3) row[index] = (row[index] + Math.floor((left + above) / 2)) & 0xff;
    else if (filter === 4) row[index] = (row[index] + paethPredictor(left, above, upperLeft)) & 0xff;
    else assert(filter === 0, `Unsupported PNG row filter ${filter}`);
  }
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function countPixel(band, dark, transparent) {
  band.total += 1;
  if (dark) band.dark += 1;
  if (transparent) band.transparent += 1;
}

function ratiosFor(bands, field) {
  return Object.fromEntries(
    Object.entries(bands).map(([edge, values]) => [
      edge,
      Number((values[field] / values.total).toFixed(6)),
    ]),
  );
}

function assertCoherentCaptureFrame(profile, id) {
  for (const [edge, ratio] of Object.entries(profile.edgeDarkRatio)) {
    assert(ratio < 0.25, `${id} ${edge} viewport edge contains a black capture band`);
  }
  for (const [edge, ratio] of Object.entries(profile.edgeTransparentRatio)) {
    assert(ratio === 0, `${id} ${edge} viewport edge contains transparent capture pixels`);
  }
}

function readWebpDimensions(bytes) {
  assert(bytes.toString("ascii", 0, 4) === "RIFF", "Invalid WebP RIFF");
  assert(bytes.toString("ascii", 8, 12) === "WEBP", "Invalid WebP signature");
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function websiteCaptureSvg(title, description, webpBytes, dimensions) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(description)}</desc>`,
    `<image width="${dimensions.width}" height="${dimensions.height}" preserveAspectRatio="xMidYMid meet" href="data:image/webp;base64,${webpBytes.toString("base64")}"/>`,
    "</svg>",
    "",
  ].join("");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(command, args, cwd) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stdout}${stderr}`));
    });
  });
}

function onceExit(child) {
  return new Promise((resolvePromise) => child.once("exit", resolvePromise));
}
