import type { ProviderUsage } from "../contract";

const OLLAMA_ME_URL = "http://127.0.0.1:11434/api/me";
const FETCH_MS = 2_000;
const CLOUD_MESSAGE =
  "Ollama Cloud has no remaining-% API. Local daemon is not running.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function planFromMe(body: unknown): string | null {
  if (!isRecord(body)) return null;
  for (const key of ["plan", "tier", "product"]) {
    const value = body[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  const user = body.user;
  if (isRecord(user) && typeof user.plan === "string" && user.plan.length > 0) {
    return user.plan;
  }
  return null;
}

export async function ollamaUsage(args: {
  providerId: string;
  contextPercent: number | null;
}): Promise<ProviderUsage> {
  try {
    const response = await fetch(OLLAMA_ME_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!response.ok) {
      return {
        id: args.providerId,
        name: "Ollama",
        status: "ok",
        planLabel: null,
        message: CLOUD_MESSAGE,
        windows: [],
      };
    }
    const body: unknown = await response.json();
    return {
      id: args.providerId,
      name: "Ollama",
      status: "ok",
      planLabel: planFromMe(body),
      message: "No remaining-% API for Ollama Cloud.",
      windows: [],
    };
  } catch {
    return {
      id: args.providerId,
      name: "Ollama",
      status: "ok",
      planLabel: null,
      message: CLOUD_MESSAGE,
      windows: [],
    };
  }
}
