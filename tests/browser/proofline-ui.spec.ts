import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

const surfaceNames = {
  browse: "Episode browser",
  scrub: "Episode scrubber",
  clusters: "Failure intelligence",
  compare: "Episode metadata compare",
  probe: "VLA robustness probe",
  qa: "Sensor QA",
  export: "Export",
  settings: "Settings",
} as const;

const viewLabels = {
  browse: "Browse",
  scrub: "Review",
  clusters: "Failures",
  compare: "Compare",
  probe: "VLA probe",
  qa: "Sensor QA",
  export: "Export",
  settings: "Settings",
} as const;

type ViewId = keyof typeof surfaceNames;

async function dismissOnboarding(page: Page) {
  const dialog = page.getByRole("dialog", { name: "First-run onboarding" });
  if (await dialog.isVisible()) {
    await page.getByRole("button", { name: "Explore sample" }).click();
  }
}

async function openView(page: Page, view: ViewId, width: number) {
  if (width <= 760) {
    await page.getByLabel("Workspace view").selectOption(view);
  } else {
    await page
      .getByRole("complementary", { name: "Datasets and saved views" })
      .getByRole("button", { name: viewLabels[view], exact: true })
      .click();
  }
  await expect(page.getByRole("region", { name: surfaceNames[view], exact: true })).toBeVisible();
}

async function installAxe(page: Page) {
  const loaded = await page.evaluate(() => Boolean((window as unknown as { axe?: unknown }).axe));
  if (!loaded) await page.addScriptTag({ content: axeSource });
}

async function assertNoAxeViolations(page: Page, label: string) {
  await installAxe(page);
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: Document,
          options: { runOnly: { type: "tag"; values: string[] } },
        ) => Promise<{
          violations: Array<{
            id: string;
            impact: string | null;
            help: string;
            nodes: Array<{ target: string[]; failureSummary: string; html: string }>;
          }>;
        }>;
      };
    }).axe;
    const result = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        failureSummary: node.failureSummary,
        html: node.html,
      })),
    }));
  });
  expect(violations, `${label} axe violations`).toEqual([]);
}

test("WCAG 2.2 AA and viewport geometry hold across every responsive width", async ({ page }) => {
  test.setTimeout(180_000);
  const viewports = [
    { name: "phone-320", width: 320, height: 720 },
    { name: "phone-390", width: 390, height: 844 },
    { name: "landscape-568", width: 568, height: 320 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "compact-1020", width: 1020, height: 800 },
    { name: "desktop-1440", width: 1440, height: 960 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissOnboarding(page);

    for (const view of ["browse", "scrub", "clusters", "export", "settings"] as ViewId[]) {
      await openView(page, view, viewport.width);
      const geometry = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        unlabeledButtons: [...document.querySelectorAll("button")].filter((button) => {
          if (button.getClientRects().length === 0) return false;
          const text = button.textContent?.trim();
          return !text && !button.getAttribute("aria-label") && !button.getAttribute("title");
        }).length,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.unlabeledButtons).toBe(0);
      await assertNoAxeViolations(page, `${viewport.name}/${view}`);
    }
  }
});

test("compact navigation is named and closed drawers stay inert and out of focus order", async ({ page }) => {
  for (const width of [768, 1020]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await dismissOnboarding(page);
    const navButtons = page.locator("#workspace-navigation .mode-list button");
    expect(await navButtons.count()).toBeGreaterThan(0);
    const labels = await navButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    expect(labels.every((label) => Boolean(label?.trim()))).toBe(true);
    const inspector = page.locator("#episode-inspector");
    expect(await inspector.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
    await expect(inspector).toHaveAttribute("aria-hidden", "true");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await dismissOnboarding(page);
  const sidebar = page.locator("#workspace-navigation");
  const inspector = page.locator("#episode-inspector");
  expect(await sidebar.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  expect(await inspector.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(inspector).toHaveAttribute("aria-hidden", "true");

  for (let index = 0; index < 20; index += 1) await page.keyboard.press("Tab");
  const focusLocation = await page.evaluate(() => ({
    inSidebar: Boolean(document.activeElement?.closest("#workspace-navigation")),
    inInspector: Boolean(document.activeElement?.closest("#episode-inspector")),
  }));
  expect(focusLocation).toEqual({ inSidebar: false, inInspector: false });
});

test("onboarding and command palette trap focus, inert the shell, close on Escape, and restore focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  const onboarding = page.getByRole("dialog", { name: "First-run onboarding" });
  const explore = page.getByRole("button", { name: "Explore sample" });
  const dismiss = page.getByRole("button", { name: "Dismiss" });
  await expect(onboarding).toBeVisible();
  await expect(explore).toBeFocused();
  expect(await page.locator(".topbar").evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await dismiss.focus();
  await page.keyboard.press("Tab");
  await expect(explore).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dismiss).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(onboarding).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open JSON dataset" })).toBeFocused();

  const trigger = page.getByRole("button", { name: "Search commands" });
  await trigger.focus();
  await page.keyboard.press("ControlOrMeta+K");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  const search = page.getByRole("textbox", { name: "Search commands" });
  const lastCommand = page.locator(".command-results button").last();
  await expect(palette).toBeVisible();
  await expect(search).toBeFocused();
  expect(await page.locator(".layout").evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await lastCommand.focus();
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastCommand).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.locator(".layout").evaluate((element) => (element as HTMLElement).inert)).toBe(false);
});

test("playback advances, clamps, and Space preserves native control and contenteditable behavior", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await dismissOnboarding(page);
  await openView(page, "scrub", 1440);

  const scrubber = page.getByRole("slider", { name: "Frame-accurate scrubber" });
  const play = page.getByRole("button", { name: "Play episode" });
  const start = Number(await scrubber.inputValue());
  await play.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause episode" })).toBeFocused();
  await expect.poll(async () => Number(await scrubber.inputValue())).toBeGreaterThan(start + 0.02);
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play episode" })).toBeFocused();

  const duration = Number(await scrubber.getAttribute("max"));
  await scrubber.fill(String(duration - 0.01));
  await expect.poll(async () => Number(await scrubber.inputValue())).toBeGreaterThan(duration - 0.02);
  await page.getByRole("button", { name: "Play episode" }).click();
  await expect.poll(async () => Number(await scrubber.inputValue())).toBe(duration);
  await expect(page.getByRole("button", { name: "Play episode" })).toBeVisible();

  const outcome = page.locator(".decision-button").first();
  const before = await outcome.textContent();
  await outcome.focus();
  await page.keyboard.press("Space");
  await expect(outcome).not.toHaveText(before ?? "");
  await expect(page.getByRole("button", { name: "Play episode" })).toBeVisible();

  await page.locator(".scrub-surface").evaluate((surface) => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.dataset.testid = "space-editor";
    editor.textContent = "local";
    surface.append(editor);
    editor.focus();
  });
  await page.keyboard.press("Space");
  await expect(page.getByTestId("space-editor")).toHaveText("local ");
  await expect(page.getByRole("button", { name: "Play episode" })).toBeVisible();
});

test("local intake parses JSON provenance, preserves unknowns, and rejects binary files without changing datasets", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open my dataset" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "manifest.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      name: "browser_audit_manifest",
      format: "LeRobot v3",
      episodes: [
        {
          id: "audit-001",
          task: "inspect_fixture",
          duration_s: 8,
          frame_rate_hz: 24,
          sensors: [{ id: "front", label: "Front RGB", kind: "rgb", rate_hz: 24 }],
        },
        {
          id: "audit-002",
          success: "failure",
          failure_cluster: "declared-browser-failure",
        },
      ],
    })),
  });

  await expect(page.getByText("Opened browser_audit_manifest: 2 local episode records.")).toBeVisible();
  await expect(page.locator(".brand-path strong")).toHaveText("browser_audit_manifest");
  await expect(page.getByRole("button", { name: "Open audit-001" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open audit-002" })).toBeVisible();
  await openView(page, "scrub", 1440);
  await expect(page.getByText("Imported manifest metadata")).toBeVisible();
  await expect(page.getByRole("figure", { name: /imported manifest metadata/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /no media evidence was parsed/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "Episode decision" })).toContainText("unknown");
  await openView(page, "export", 1440);
  await expect(page.getByRole("note", { name: "Dataset provenance" })).toContainText("Imported local manifest");
  await expect(page.getByRole("note", { name: "Dataset provenance" })).not.toContainText("Synthetic sample");

  await expect(page.locator("input[type='file']").first()).toHaveAttribute("accept", ".json,.jsonl,application/json,application/x-ndjson");
  const binaryChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open JSON dataset" }).click();
  const binaryChooser = await binaryChooserPromise;
  await binaryChooser.setFiles({
    name: "fake.parquet",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not-a-real-parquet-file"),
  });
  await expect(page.getByRole("alert")).toContainText(/Binary adapter unavailable in this source build; no episode evidence parsed/);
  await expect(page.locator(".brand-path strong")).toHaveText("browser_audit_manifest");
  await expect(page.getByRole("tab", { name: /fake\.parquet/ })).toHaveCount(0);
});

test("clustering, split, merge, undo, and keyboard workflow visibly update deterministic state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await dismissOnboarding(page);
  await openView(page, "clusters", 1440);

  await page.getByRole("button", { name: "Run clustering" }).click();
  await expect(page.getByRole("progressbar", { name: "Clustering progress" })).toBeVisible();
  await expect(page.getByText(/Recomputed 3 deterministic clusters/)).toBeVisible();
  await expect(page.getByTestId("failure-card")).toHaveCount(3);

  await page.getByRole("button", { name: /Split gripper slip on glossy objects cluster/ }).click();
  await expect(page.getByTestId("failure-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("failure-card")).toHaveCount(3);

  await page.getByRole("button", { name: /Merge gripper slip on glossy objects cluster/ }).click();
  await expect(page.getByTestId("failure-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("failure-card")).toHaveCount(3);

  await page.keyboard.press("ControlOrMeta+P");
  await expect(page.getByText(/Only one dataset is open/)).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+V");
  await expect(page.getByRole("button", { name: "Review view 2" })).toBeVisible();
  await page.keyboard.press("v");
  await expect(page.getByRole("region", { name: "VLA robustness probe" })).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.getByRole("region", { name: "Sensor QA" })).toBeVisible();
});

test("probe, QA, and real ZIP export generate deterministic local artifacts with scope toggles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await dismissOnboarding(page);

  await openView(page, "probe", 1440);
  await page.getByLabel("Trials").fill("2");
  await page.getByRole("button", { name: "Run probe" }).click();
  await expect(page.locator(".trial-row")).toHaveCount(2);
  const jsonButton = page.getByRole("button", { name: "Download JSON" });
  await expect(jsonButton).toBeVisible();
  const [probeDownload] = await Promise.all([page.waitForEvent("download"), jsonButton.click()]);
  expect(probeDownload.suggestedFilename()).toBe("so101_kitchen_v3-vla-probe.json");
  const probePath = await probeDownload.path();
  const probe = JSON.parse(await readFile(probePath!, "utf8")) as { executedTrials: number; maxTrials: number };
  expect(probe.executedTrials).toBe(2);
  expect(probe.maxTrials).toBe(4);
  const [probeMarkdown] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Markdown" }).click(),
  ]);
  expect(await readFile((await probeMarkdown.path())!, "utf8")).toContain("Executed trials: 2");

  await openView(page, "qa", 1440);
  const [qaDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Markdown" }).click(),
  ]);
  const qa = await readFile((await qaDownload.path())!, "utf8");
  expect(qa).toContain("Repository synthetic fixture");
  expect(qa).toContain("Episodes: 96");

  await openView(page, "export", 1440);
  await page.locator("[data-export-step='scope'] .step-toggle").click();
  await page.getByLabel("Include sensor QA evidence").uncheck();
  await page.getByLabel("Include embodiment card").uncheck();
  await expect(page.getByText("sensor-qa.json")).toHaveCount(0);
  await expect(page.getByText("EMBODIMENT_CARD.md")).toHaveCount(0);
  const [zipDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Confirm and export ZIP" }).click(),
  ]);
  expect(zipDownload.suggestedFilename()).toBe("so101_kitchen_v3-robotics-evidence.zip");
  const zipBytes = await readFile((await zipDownload.path())!);
  const zipEntries = readStoredZip(zipBytes);
  expect([...zipEntries.keys()]).toEqual([
    "review-manifest.json",
    "interventions.jsonl",
    "checksums.sha256",
  ]);
  expect(JSON.parse(zipEntries.get("review-manifest.json")!).episodes).toHaveLength(96);
  expect(zipEntries.get("checksums.sha256")).toContain("review-manifest.json");
  await expect(page.getByText("Local evidence ZIP downloaded")).toBeVisible();

  await page.locator("[data-export-step='destination'] .step-toggle").click();
  await page.getByRole("button", { name: "HF Hub", exact: true }).click();
  await expect(page.getByText("Network destination not configured")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm and export ZIP" })).toBeDisabled();
});

test("desktop cockpit, failure rows, settings, and mobile targets remain internally contained", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await dismissOnboarding(page);
  const rail = page.getByRole("complementary", { name: "Datasets and saved views" });
  const railBox = await rail.boundingBox();
  expect(railBox?.width).toBeGreaterThanOrEqual(208);
  expect(railBox?.width).toBeLessThanOrEqual(224);
  const inspector = page.getByRole("complementary", { name: "Episode inspector" });
  await expect(inspector).toBeHidden();
  await page.getByRole("button", { name: "Open inspector" }).click();
  const inspectorBox = await inspector.boundingBox();
  expect(inspectorBox?.width).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Close inspector" }).click();

  await openView(page, "scrub", 1440);
  const evidence = page.getByRole("figure", { name: /synthetic evidence viewport/ });
  const ratio = await evidence.evaluate((element) => element.clientWidth / element.clientHeight);
  expect(ratio).toBeGreaterThan(1.74);
  expect(ratio).toBeLessThan(1.82);
  const wrist = page.getByRole("tab", { name: /cam_wrist/i });
  await wrist.click();
  await expect(wrist).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("review-dock")).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissOnboarding(page);
    await openView(page, "clusters", viewport.width);
    const cards = page.getByTestId("failure-card");
    await expect(cards).toHaveCount(3);
    const overflow = await cards.evaluateAll((elements) => elements.map((element) => {
      const card = element.getBoundingClientRect();
      return {
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        controlsOutside: [...element.querySelectorAll("button")].some((button) => {
          const rect = button.getBoundingClientRect();
          return rect.left < card.left || rect.right > card.right || rect.top < card.top || rect.bottom > card.bottom;
        }),
        mediaOutside: [...element.querySelectorAll(".sensor-preview")].some((media) => {
          const rect = media.getBoundingClientRect();
          return rect.left < card.left || rect.right > card.right || rect.top < card.top || rect.bottom > card.bottom;
        }),
      };
    }));
    expect(overflow.every((item) => item.scrollWidth <= item.clientWidth && !item.controlsOutside && !item.mediaOutside)).toBe(true);
  }

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 1440, height: 960 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissOnboarding(page);
    await openView(page, "settings", viewport.width);
    const geometry = await page.locator(".settings-surface").evaluate((surface) => {
      const panel = surface.querySelector(".diagnostic-log");
      if (!(panel instanceof HTMLElement)) throw new Error("Local diagnostic preview missing");
      const surfaceRect = surface.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        surfaceScrollWidth: surface.scrollWidth,
        surfaceClientWidth: surface.clientWidth,
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        surfaceLeft: surfaceRect.left,
        surfaceRight: surfaceRect.right,
      };
    });
    expect(geometry.surfaceScrollWidth).toBeLessThanOrEqual(geometry.surfaceClientWidth);
    expect(geometry.panelLeft).toBeGreaterThanOrEqual(geometry.surfaceLeft);
    expect(geometry.panelRight).toBeLessThanOrEqual(geometry.surfaceRight);
    await expect(page.getByText("Source build / unpublished")).toBeVisible();
    await expect(page.getByText(/Unavailable in this source build; no key is generated or stored/)).toBeVisible();
  }
});

test("320 export and 568 landscape review expose the advertised decision path without internal clipping", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await dismissOnboarding(page);
  await openView(page, "export", 320);
  await expect(page.locator("[data-export-step='source']")).not.toHaveClass(/expanded/);
  await expect(page.locator("[data-export-step='destination']")).not.toHaveClass(/expanded/);
  await expect(page.locator("[data-export-step='scope']")).not.toHaveClass(/expanded/);
  await expect(page.locator("[data-export-step='artifacts']")).toHaveClass(/expanded/);
  await expect(page.getByText("review-manifest.json")).toBeVisible();
  const exportGeometry = await page.locator(".export-surface").evaluate((surface) => {
    const artifacts = surface.querySelector("[data-export-step='artifacts']")!.getBoundingClientRect();
    const confirmation = surface.querySelector("[data-export-step='confirmation']")!.getBoundingClientRect();
    const cta = surface.querySelector(".export-cta")!.getBoundingClientRect();
    const bounds = surface.getBoundingClientRect();
    return {
      scrollHeight: surface.scrollHeight,
      clientHeight: surface.clientHeight,
      artifactsTop: artifacts.top,
      confirmationBottom: confirmation.bottom,
      ctaBottom: cta.bottom,
      surfaceTop: bounds.top,
      surfaceBottom: bounds.bottom,
    };
  });
  expect(exportGeometry.scrollHeight).toBeLessThanOrEqual(exportGeometry.clientHeight + 1);
  expect(exportGeometry.artifactsTop).toBeGreaterThanOrEqual(exportGeometry.surfaceTop);
  expect(exportGeometry.confirmationBottom).toBeLessThanOrEqual(exportGeometry.surfaceBottom + 1);
  expect(exportGeometry.ctaBottom).toBeLessThanOrEqual(720);

  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("/");
  await dismissOnboarding(page);
  await openView(page, "scrub", 568);
  await expect(page.getByRole("group", { name: "Episode decision" })).toBeVisible();
  await expect(page.getByRole("figure", { name: /synthetic evidence viewport/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /health pass/i }).first()).toBeVisible();
  await expect(page.getByTestId("review-dock")).toBeVisible();
  const landscape = await page.locator(".scrub-surface").evaluate((surface) => {
    const selectors = [
      ".review-heading",
      ".evidence-viewport",
      ".sensor-selector",
      "[data-testid='review-dock']",
    ];
    const bounds = surface.getBoundingClientRect();
    return selectors.map((selector) => {
      const element = surface.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        surfaceLeft: bounds.left,
        surfaceRight: bounds.right,
        surfaceTop: bounds.top,
        surfaceBottom: bounds.bottom,
      };
    });
  });
  expect(landscape.every((item) =>
    item.left >= item.surfaceLeft
    && item.right <= item.surfaceRight
    && item.top >= item.surfaceTop
    && item.bottom <= item.surfaceBottom
  )).toBe(true);
});

test("visible mobile controls have 44 px targets and checkbox labels provide 44 px activation areas", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 568, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissOnboarding(page);
    for (const view of ["scrub", "clusters", "export", "settings"] as ViewId[]) {
      await openView(page, view, viewport.width);
      const undersized = await page
        .locator(".topbar button, .mobile-view-switch select, .surface button, .surface select, .surface input:not([type='checkbox']), .surface summary")
        .evaluateAll((controls) => controls.flatMap((control) => {
          const rect = control.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return [];
          return rect.width < 44 || rect.height < 44
            ? [{ label: control.getAttribute("aria-label") ?? control.textContent?.trim(), width: rect.width, height: rect.height }]
            : [];
        }));
      expect(undersized, `${viewport.width}x${viewport.height}/${view} undersized controls`).toEqual([]);

      const undersizedCheckboxTargets = await page.locator(".surface input[type='checkbox']").evaluateAll((checkboxes) =>
        checkboxes.flatMap((checkbox) => {
          const inputRect = checkbox.getBoundingClientRect();
          if (inputRect.width === 0 || inputRect.height === 0) return [];
          const label = checkbox.closest("label");
          const rect = label?.getBoundingClientRect();
          return !rect || rect.width < 44 || rect.height < 44
            ? [{ label: label?.textContent?.trim(), width: rect?.width ?? 0, height: rect?.height ?? 0 }]
            : [];
        }),
      );
      expect(undersizedCheckboxTargets).toEqual([]);
    }
  }
});

test("reduced motion and forced colors retain a solid visible focus treatment", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await dismissOnboarding(page);
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const styles = await focused.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      animationDuration: computed.animationDuration,
      transitionDuration: computed.transitionDuration,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
    };
  });
  expect(Number.parseFloat(styles.animationDuration)).toBeLessThanOrEqual(0.00001);
  expect(Number.parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(0.00001);
  expect(styles.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(styles.outlineWidth)).toBeGreaterThanOrEqual(2);
});

test("legacy named entry redirects to the canonical app", async ({ page }) => {
  await page.goto("/Robotics%20Studio.html");
  await expect(page).toHaveURL("http://127.0.0.1:4178/");
  await expect(page).toHaveTitle("Robotics Studio Open | AuraOne");
});

function readStoredZip(bytes: Uint8Array) {
  const entries = new Map<string, string>();
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 4 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    if (view.getUint32(0, true) !== 0x04034b50) break;
    const size = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    entries.set(name, decoder.decode(bytes.slice(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  return entries;
}
