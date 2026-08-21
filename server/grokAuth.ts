/**
 * Parse Grok / xAI auth files without retaining or returning secrets.
 * Prefer the current xAI OIDC entry; never refresh tokens.
 *
 * Shapes:
 * - Grok CLI `~/.grok/auth.json`: OIDC-url keys, entry.key bearer
 * - Pi `~/.pi/agent/auth.json` and OpenCode `auth.json`: { xai: { type, access, expires } }
 */

export type GrokAuthPick = {
  planHint: string | null;
  expired: boolean;
};

type AuthEntry = {
  key?: unknown;
  access?: unknown;
  auth_mode?: unknown;
  expires_at?: unknown;
  expires?: unknown;
  type?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEntry(value: unknown): AuthEntry | null {
  if (!isRecord(value)) return null;
  return value;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function entryToken(entry: AuthEntry): string | null {
  return nonEmptyString(entry.key);
}

function oauthAccess(entry: AuthEntry): string | null {
  return nonEmptyString(entry.access);
}

function entryExpired(entry: AuthEntry, nowMs: number): boolean {
  if (typeof entry.expires === "number" && Number.isFinite(entry.expires)) {
    return entry.expires <= nowMs;
  }
  if (typeof entry.expires_at !== "string") return false;
  const expires = Date.parse(entry.expires_at);
  return Number.isFinite(expires) && expires <= nowMs;
}

function planHint(entry: AuthEntry): string | null {
  return nonEmptyString(entry.auth_mode);
}

function rankedKeys(raw: Record<string, unknown>): string[] {
  const keys = Object.keys(raw);
  return keys.sort((left, right) => {
    const leftScore = left.startsWith("https://auth.x.ai") ? 0 : 1;
    const rightScore = right.startsWith("https://auth.x.ai") ? 0 : 1;
    return leftScore - rightScore;
  });
}

function fromOauthBag(
  value: unknown,
  nowMs: number,
): { token: string; meta: GrokAuthPick } | null {
  const entry = readEntry(value);
  if (!entry) return null;
  const type = nonEmptyString(entry.type);
  // Subscription remaining is OAuth (Pi /login xai, OpenCode xai oauth).
  // API keys are a different billing surface and are not reused here.
  if (type && type !== "oauth") return null;
  const token = oauthAccess(entry);
  if (!token) return null;
  return {
    token,
    meta: {
      planHint: planHint(entry),
      expired: entryExpired(entry, nowMs),
    },
  };
}

/** Returns the bearer for a one-shot request. Caller must not log or persist it. */
export function extractGrokBearer(
  raw: unknown,
  nowMs = Date.now(),
): { token: string; meta: GrokAuthPick } | null {
  if (!isRecord(raw)) return null;
  for (const key of rankedKeys(raw)) {
    const entry = readEntry(raw[key]);
    if (!entry) continue;
    const token = entryToken(entry);
    if (!token) continue;
    return {
      token,
      meta: {
        planHint: planHint(entry),
        expired: entryExpired(entry, nowMs),
      },
    };
  }
  return null;
}

/**
 * Read a bearer from Grok CLI auth.json, Pi auth.json, or OpenCode auth.json.
 * Never returns refresh tokens or emails.
 */
export function pickGrokAuth(
  raw: unknown,
  nowMs = Date.now(),
): { token: string; meta: GrokAuthPick } | null {
  if (!isRecord(raw)) return null;
  if ("xai" in raw) {
    const fromXai = fromOauthBag(raw.xai, nowMs);
    if (fromXai) return fromXai;
    // Pi/OpenCode store xai as oauth or api_key. API keys are not a
    // subscription-remaining path; do not treat `key` as a Grok CLI bearer.
    return null;
  }
  return extractGrokBearer(raw, nowMs);
}

export function parseGrokSubscriptionBody(body: unknown): {
  planLabel: string | null;
  usedPercent: number | null;
  resetsAt: string | null;
} {
  if (!isRecord(body)) {
    return { planLabel: null, usedPercent: null, resetsAt: null };
  }

  const planLabel =
    stringField(body, "plan") ??
    stringField(body, "tier") ??
    stringField(body, "planLabel") ??
    nestedString(body, "subscription", "plan") ??
    nestedString(body, "subscription", "tier");

  const usedPercent =
    numberField(body, "usagePercent") ??
    numberField(body, "usedPercent") ??
    nestedNumber(body, "usage", "usedPercent") ??
    nestedNumber(body, "credits", "usagePercent");

  const resetsAt =
    stringField(body, "resetsAt") ??
    nestedString(body, "currentPeriod", "end") ??
    nestedString(body, "billingCycle", "billingPeriodEnd") ??
    nestedString(body, "subscription", "currentPeriodEnd");

  return {
    planLabel,
    usedPercent:
      usedPercent === null ? null : Math.min(100, Math.max(0, usedPercent)),
    resetsAt,
  };
}

/** cli-chat-proxy.grok.com/v1/billing?format=credits */
export function parseGrokBillingBody(body: unknown): {
  usedPercent: number | null;
  resetsAt: string | null;
  windowLabel: string;
} {
  if (!isRecord(body) || !isRecord(body.config)) {
    return { usedPercent: null, resetsAt: null, windowLabel: "Limit" };
  }
  const config = body.config;
  const usedPercent =
    numberField(config, "creditUsagePercent") ??
    productUsagePercent(config.productUsage, "GrokBuild") ??
    productUsagePercent(config.productUsage, null);

  const period = isRecord(config.currentPeriod) ? config.currentPeriod : null;
  const periodType = period ? stringField(period, "type") : null;
  const resetsAt =
    (period ? stringField(period, "end") : null) ??
    stringField(config, "billingPeriodEnd");
  const weekly =
    typeof periodType === "string" && /weekly/i.test(periodType);

  return {
    usedPercent:
      usedPercent === null ? null : Math.min(100, Math.max(0, usedPercent)),
    resetsAt,
    windowLabel: weekly ? "Weekly Limit" : "Limit",
  };
}

export function parseGrokUserTier(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const tier = stringField(body, "subscriptionTier");
  if (!tier) return null;
  return PLAN_LABELS[tier] ?? tier;
}

const PLAN_LABELS: Record<string, string> = {
  Free: "Free",
  SuperGrokLite: "SuperGrok Lite",
  GrokLite: "SuperGrok Lite",
  GrokPro: "SuperGrok",
  SuperGrok: "SuperGrok",
  SuperGrokPlus: "SuperGrok Plus",
  GrokPlus: "SuperGrok Plus",
  GrokHeavy: "SuperGrok Heavy",
  SuperGrokHeavy: "SuperGrok Heavy",
};

function productUsagePercent(
  value: unknown,
  product: string | null,
): number | null {
  if (!Array.isArray(value)) return null;
  for (const row of value) {
    if (!isRecord(row)) continue;
    if (product && stringField(row, "product") !== product) continue;
    const percent = numberField(row, "usagePercent");
    if (percent !== null) return percent;
  }
  return null;
}

function stringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberField(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedString(
  record: Record<string, unknown>,
  parent: string,
  key: string,
): string | null {
  const nested = record[parent];
  return isRecord(nested) ? stringField(nested, key) : null;
}

function nestedNumber(
  record: Record<string, unknown>,
  parent: string,
  key: string,
): number | null {
  const nested = record[parent];
  return isRecord(nested) ? numberField(nested, key) : null;
}
