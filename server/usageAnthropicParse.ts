import type { UsageWindow } from "../contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Anthropic sends 7 for 7% or 0.07 for 7%. Values > 1 are already percent. */
export function utilizationToUsedPercent(utilization: number): number {
  if (!Number.isFinite(utilization)) return 0;
  const used = utilization > 1 ? utilization : utilization * 100;
  return Math.min(100, Math.max(0, Math.round(used * 10) / 10));
}

function windowFromUtil(
  label: string,
  value: unknown,
): UsageWindow | null {
  if (!isRecord(value) || typeof value.utilization !== "number") return null;
  const resetsAt =
    typeof value.resets_at === "string" ? value.resets_at : null;
  return {
    label,
    usedPercent: utilizationToUsedPercent(value.utilization),
    resetsAt,
  };
}

function windowsFromLimits(body: Record<string, unknown>): UsageWindow[] {
  if (!Array.isArray(body.limits)) return [];
  const windows: UsageWindow[] = [];
  for (const row of body.limits) {
    if (!isRecord(row) || typeof row.percent !== "number") continue;
    const kind = typeof row.kind === "string" ? row.kind : "";
    const label =
      kind === "session" || kind === "five_hour"
        ? "5h Limit"
        : kind.startsWith("weekly")
          ? "Weekly Limit"
          : null;
    if (!label) continue;
    const resetsAt =
      typeof row.resets_at === "string" ? row.resets_at : null;
    windows.push({
      label,
      usedPercent: Math.min(100, Math.max(0, row.percent)),
      resetsAt,
    });
  }
  return windows;
}

export function parseAnthropicUsage(body: unknown): UsageWindow[] {
  if (!isRecord(body)) return [];
  const fromLimits = windowsFromLimits(body);
  if (fromLimits.length > 0) return fromLimits;
  const fiveHour = windowFromUtil("5h Limit", body.five_hour);
  const weekly = windowFromUtil("Weekly Limit", body.seven_day);
  return [fiveHour, weekly].filter((row): row is UsageWindow => row !== null);
}
