import type { UsageWindow } from "../contract.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function windowFromLimit(label: string, value: unknown): UsageWindow | null {
  if (!isRecord(value) || typeof value.usage !== "number" || !Number.isFinite(value.usage)) {
    return null;
  }
  const resetsAt =
    typeof value.resetsAt === "string"
      ? value.resetsAt
      : typeof value.reset_at === "string"
        ? value.reset_at
        : null;
  return {
    label,
    usedPercent: Math.min(100, Math.max(0, value.usage * 100)),
    resetsAt,
  };
}

export function parseOllamaUsage(body: unknown): UsageWindow[] {
  if (!isRecord(body) || !isRecord(body.limits)) return [];
  const weekly = windowFromLimit("Weekly", body.limits.weekly);
  const session = windowFromLimit("Session", body.limits.session);
  return [weekly, session].filter(
    (window): window is UsageWindow => window !== null,
  );
}
