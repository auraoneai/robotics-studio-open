import type { AuraTelemetryEvent } from "@auraone/aura-ide-kit";
import {
  ROBOTICS_PLATFORM_HOOKS,
  TelemetryEventLog,
  createTelemetryEvent,
  ensureIntakeInstallSigningKeypair,
  intakeInstallSigningKeypairKey,
  type IntakeInstallSigningKeypair,
  type KeychainApi,
  type TelemetryLogEntry,
} from "@auraone/platform-contracts";

export { ROBOTICS_PLATFORM_HOOKS, TelemetryEventLog };
export type { TelemetryLogEntry };

const installId = "123e4567-e89b-42d3-a456-426614174100";
const sessionId = "123e4567-e89b-42d3-a456-426614174101";
const memoryKeychain = new Map<string, string>();

export function createRoboticsTelemetryEvent(
  eventName: "robotics_dataset_opened" | "robotics_export_completed" | "robotics_feature_used",
  payload: Record<string, string | number | boolean>,
) {
  return createTelemetryEvent({
    eventName,
    eventId: createUuid(),
    timestamp: new Date().toISOString(),
    sessionId,
    app: { flagship: "robotics-studio-open", version: "0.1.0", channel: "stable" },
    device: {
      install_id: installId,
      os: platformOs(),
      os_version: navigator.platform || "unknown",
      arch: platformArch(),
    },
    payload,
  });
}

export function toAuraTelemetryEvents(entries: readonly TelemetryLogEntry[]): AuraTelemetryEvent[] {
  return entries.map((entry) => ({
    id: entry.event.event_id,
    name: entry.event.event_name,
    timestamp: entry.recorded_at,
    optedIn: entry.status === "sent",
    destination: entry.status === "sent" ? "telemetry" : "local",
    payloadPreview: {
      validation: entry.validation.valid ? "valid" : entry.validation.errors,
      ...entry.event.payload,
    },
  }));
}

export function ensureRoboticsIntakeInstallSigningKeypair(): Promise<IntakeInstallSigningKeypair> {
  return ensureIntakeInstallSigningKeypair(memoryKeychainApi, "robotics-studio-open", () => {
    const key = intakeInstallSigningKeypairKey("robotics-studio-open");
    return {
      algorithm: "Ed25519",
      public_key: `${key.service}:${key.identifier}:public`,
      private_key: `${key.service}:${key.identifier}:private`,
      created_at: new Date().toISOString(),
    };
  });
}

const memoryKeychainApi: KeychainApi = {
  async set(key, value) {
    memoryKeychain.set(keychainId(key), value);
  },
  async get(key) {
    return memoryKeychain.get(keychainId(key)) ?? null;
  },
  async delete(key) {
    memoryKeychain.delete(keychainId(key));
  },
  async list(service, scope) {
    return [...memoryKeychain.keys()]
      .filter((key) => key.startsWith(`${service}:${scope}:`))
      .map((key) => key.split(":").at(-1) ?? "");
  },
};

function keychainId(key: { service: string; scope: string; identifier: string }) {
  return `${key.service}:${key.scope}:${key.identifier}`;
}

function platformOs(): "darwin" | "windows" | "linux" {
  const value = navigator.platform.toLowerCase();
  if (value.includes("mac")) return "darwin";
  if (value.includes("win")) return "windows";
  return "linux";
}

function platformArch(): "x86_64" | "aarch64" {
  const value = navigator.userAgent.toLowerCase();
  return value.includes("arm") || value.includes("aarch64") ? "aarch64" : "x86_64";
}

function createUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "123e4567-e89b-42d3-a456-426614174102";
}
