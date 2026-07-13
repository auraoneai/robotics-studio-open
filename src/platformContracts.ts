import type { AuraTelemetryEvent } from "@auraone/aura-ide-kit";
import {
  ROBOTICS_PLATFORM_HOOKS,
  createTauriKeychainApi,
  ensureIntakeInstallSigningKeypair,
  intakeInstallSigningKeypairKey,
  type IntakeInstallSigningKeypair,
  type TauriInvoke,
} from "@auraone/platform-contracts";

export { ROBOTICS_PLATFORM_HOOKS };
export const roboticsIntakeInstallSigningKeypairKey =
  intakeInstallSigningKeypairKey("robotics-studio-open");

export type LocalDiagnosticEventName =
  | "robotics_dataset_opened"
  | "robotics_export_completed"
  | "robotics_feature_used";

export type LocalDiagnosticEntry = {
  id: string;
  name: LocalDiagnosticEventName;
  recordedAt: string;
  app: {
    flagship: "robotics-studio-open";
    version: "0.2.0";
    channel: "source-build-unpublished";
  };
  payloadPreview: Record<string, string | number | boolean>;
  delivery: {
    attempted: false;
    configured: false;
  };
};

export class LocalDiagnosticEventBuffer {
  #entries: LocalDiagnosticEntry[] = [];

  record(entry: LocalDiagnosticEntry) {
    this.#entries = [...this.#entries, entry].slice(-25);
  }

  list(): readonly LocalDiagnosticEntry[] {
    return this.#entries;
  }

  clear() {
    this.#entries = [];
  }
}

export function createRoboticsDiagnosticEvent(
  name: LocalDiagnosticEventName,
  payload: Record<string, string | number | boolean>,
): LocalDiagnosticEntry {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `local-diagnostic-${Date.now()}`,
    name,
    recordedAt: new Date().toISOString(),
    app: {
      flagship: "robotics-studio-open",
      version: "0.2.0",
      channel: "source-build-unpublished",
    },
    payloadPreview: payload,
    delivery: {
      attempted: false,
      configured: false,
    },
  };
}

export function toAuraTelemetryEvents(
  entries: readonly LocalDiagnosticEntry[],
): AuraTelemetryEvent[] {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    timestamp: entry.recordedAt,
    optedIn: false,
    destination: "local",
    payloadPreview: {
      delivery: "not configured",
      ...entry.payloadPreview,
    },
  }));
}

export async function ensureRoboticsIntakeInstallSigningKeypair(): Promise<
  IntakeInstallSigningKeypair
> {
  const invoke = await loadTauriInvoke();
  if (
    !invoke ||
    typeof window === "undefined" ||
    window.__TAURI_INTERNALS__ === undefined
  ) {
    throw new Error(
      "Intake install signing is available only in the desktop app; this browser source build generates no key.",
    );
  }
  return ensureIntakeInstallSigningKeypair(
    createTauriKeychainApi(invoke),
    "robotics-studio-open",
    generateEd25519Keypair,
  );
}

async function loadTauriInvoke(): Promise<TauriInvoke | null> {
  try {
    const api = await import("@tauri-apps/api/core");
    return api.invoke as TauriInvoke;
  } catch {
    return null;
  }
}

async function generateEd25519Keypair(): Promise<IntakeInstallSigningKeypair> {
  const generated = await globalThis.crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  if (!("publicKey" in generated)) {
    throw new Error("The runtime did not return an Ed25519 keypair.");
  }
  const [publicKey, privateKey] = await Promise.all([
    globalThis.crypto.subtle.exportKey("spki", generated.publicKey),
    globalThis.crypto.subtle.exportKey("pkcs8", generated.privateKey),
  ]);
  return {
    algorithm: "Ed25519",
    public_key: encodeBase64(publicKey),
    private_key: encodeBase64(privateKey),
    created_at: new Date().toISOString(),
  };
}

function encodeBase64(value: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(value)) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}
