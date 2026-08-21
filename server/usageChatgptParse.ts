export function parseChatgptUsage(body: unknown): {
  planLabel: string | null;
  usedPercent: number | null;
  resetsAt: string | null;
  windowLabel: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { planLabel: null, usedPercent: null, resetsAt: null, windowLabel: "Weekly Limit" };
  }
  const record = body as Record<string, unknown>;
  const planLabel =
    typeof record.plan_type === "string" && record.plan_type.length > 0
      ? record.plan_type
      : null;
  const rate =
    typeof record.rate_limit === "object" &&
    record.rate_limit !== null &&
    !Array.isArray(record.rate_limit)
      ? (record.rate_limit as Record<string, unknown>)
      : null;
  const window =
    rate &&
    typeof rate.primary_window === "object" &&
    rate.primary_window !== null &&
    !Array.isArray(rate.primary_window)
      ? (rate.primary_window as Record<string, unknown>)
      : null;
  const usedPercent =
    window && typeof window.used_percent === "number"
      ? Math.min(100, Math.max(0, window.used_percent))
      : null;
  let resetsAt: string | null = null;
  if (window && typeof window.reset_at === "number") {
    resetsAt = new Date(window.reset_at * 1000).toISOString();
  }
  const seconds =
    window && typeof window.limit_window_seconds === "number"
      ? window.limit_window_seconds
      : 0;
  const windowLabel = seconds >= 86_400 * 6 ? "Weekly Limit" : "Limit";
  return { planLabel, usedPercent, resetsAt, windowLabel };
}
