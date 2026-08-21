export type BillingVendor =
  | "codex"
  | "openai"
  | "claude"
  | "cursor"
  | "grok"
  | "ollama";

export type NativeLimitVendor = Extract<BillingVendor, "codex" | "claude" | "cursor">;

export function isNativeLimitVendor(
  vendor: BillingVendor,
): vendor is NativeLimitVendor {
  return vendor === "codex" || vendor === "claude" || vendor === "cursor";
}

const LIMIT_KEYS = {
  codex: "codex",
  claude: "claudeCode",
  cursor: "cursor",
} as const satisfies Record<NativeLimitVendor, "codex" | "claudeCode" | "cursor">;

export function usageLimitsKey(
  vendor: NativeLimitVendor,
): (typeof LIMIT_KEYS)[NativeLimitVendor] {
  return LIMIT_KEYS[vendor];
}

export function billingVendorFromModel(model: string): BillingVendor | null {
  const id = model.trim().toLowerCase();
  if (!id) return null;
  if (/(claude|anthropic|sonnet|opus|haiku)/.test(id)) return "claude";
  if (/(grok|\bxai\b)/.test(id)) return "grok";
  if (/(ollama|llama)/.test(id)) return "ollama";
  if (/(cursor|composer)/.test(id)) return "cursor";
  if (/codex/.test(id)) return "codex";
  if (/(openai|\bgpt\b|chatgpt)/.test(id)) return "openai";
  return null;
}

export function vendorDisplayName(vendor: BillingVendor): string {
  switch (vendor) {
    case "claude":
      return "Claude";
    case "codex":
      return "Codex";
    case "openai":
      return "OpenAI";
    case "cursor":
      return "Cursor";
    case "grok":
      return "Grok";
    case "ollama":
      return "Ollama";
  }
}

export function noSubscriptionUsage(model: string): {
  id: string;
  name: string;
  status: "ok";
  planLabel: null;
  message: string;
  windows: [];
} {
  return {
    id: model || "unknown",
    name: model || "Unknown model",
    status: "ok",
    planLabel: null,
    message: "No subscription data",
    windows: [],
  };
}
