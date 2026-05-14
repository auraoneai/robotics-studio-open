# Aura IDE Kit

**SSR posture:** every exported component is declared in `src/ssr-posture.ts` as `ssr-safe`, `client-only`, or `client-only-with-suspense`. `AuraMonaco` is `client-only-with-suspense`; static display primitives are `ssr-safe`; shell, palette, resize, modal, toast, settings, and tab-selection surfaces are `client-only`.

`@auraone/aura-ide-kit` is the Open Studio Platform incubation package for IDE-class components that are not yet canonical AuraGlass exports. It deliberately uses AuraGlass tokens, naming, motion durations, radii, and contrast rules instead of creating a competing design system.

## Source of Truth

- AuraGlass live: `https://auraglass.auraone.ai/`
- AuraGlass package: `aura-glass@3.1.1`
- Local reference: `/Users/gurbakshchahal/auraglasswebsite`
- Platform incubation: `opensource/open-studio-platform/packages/aura-ide-kit/`

Components graduate out of this package only after they are stable in at least two flagships and are upstreamed to AuraGlass.

## Components

- `AuraIdeAppFrame`
- `AuraSplitPane`
- `AuraProjectTree`
- `AuraMonaco`
- `AuraTimeline`
- `AuraInspector`
- `AuraCommandPalette`
- `AuraStatusBar`
- `AuraProblemsPanel`
- `AuraSettingsPanel`
- `AuraWelcomePrivacyWizard`
- `AuraUpdatePrompt`
- `AuraIntakeIdentityFields`
- `AuraKeychainFallbackWarning`
- `AuraToastProvider`
- `AuraModal`
- `AuraEmptyState`, `AuraLoadingState`, `AuraErrorState`
- `AuraTelemetryEventLog`
- `AuraIntakePacketPreview`
- `AuraFileWatcherStatus`
- `AuraWelcomeWindow`
- `AuraTabbedShell`

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Usage

```tsx
import {
  AuraIdeAppFrame,
  AuraCommandPalette,
  createCommandRegistry,
} from "@auraone/aura-ide-kit";
import "@auraone/aura-ide-kit/styles.css";

const registry = createCommandRegistry();
registry.register({
  id: "project.open-folder",
  title: "Open Folder",
  group: "Project",
  keybinding: "Mod+O",
  handler: () => openFolder(),
});
```
