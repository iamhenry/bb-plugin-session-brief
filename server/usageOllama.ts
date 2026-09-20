import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProviderUsage } from "../contract.ts";
// @ts-expect-error Node's strip-types test runner resolves the source extension.
import { loadPiOpenCodeAuth, pickNamedApiKey } from "./authFiles.ts";
// @ts-expect-error Node's strip-types test runner resolves the source extension.
import { markUsageBackoff, recallUsage, rememberUsage, usageFetchDue } from "./usageCache.ts";
// @ts-expect-error Node's strip-types test runner resolves the source extension.
import { parseOllamaUsage } from "./usageOllamaParse.ts";

const USAGE_URL = "https://ollama.com/api/usage";
const FETCH_MS = 2_000;
const SIGN_IN_MESSAGE =
  "Sign in to Ollama Cloud in Pi or OpenCode to see usage.";

async function getJson(url: string, key: string): Promise<{
  status: number;
  body: unknown | null;
}> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    },
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_MS),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

export async function ollamaUsage(args: {
  bb: BbPluginApi;
  hostId: string | undefined;
  providerId: string;
  contextPercent: number | null;
}): Promise<ProviderUsage> {
  const base = { id: args.providerId, name: "Ollama" };
  const bags = await loadPiOpenCodeAuth(args.bb, args.hostId);
  const key = pickNamedApiKey(bags, ["ollama-cloud"]);
  if (!key) {
    return {
      ...base,
      status: "unauthenticated",
      planLabel: null,
      message: SIGN_IN_MESSAGE,
      windows: [],
    };
  }

  const cached = recallUsage(args.providerId);
  if (!usageFetchDue(args.providerId)) {
    return cached ?? {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows: [],
    };
  }

  try {
    const result = await getJson(USAGE_URL, key);
    if (result.status === 401 || result.status === 403) {
      return {
        ...base,
        status: "unauthenticated",
        planLabel: null,
        message: SIGN_IN_MESSAGE,
        windows: [],
      };
    }
    if (result.status < 200 || result.status >= 300 || result.body === null) {
      markUsageBackoff(args.providerId);
      return cached ?? {
        ...base,
        status: "ok",
        planLabel: null,
        message: null,
        windows: [],
      };
    }

    const windows = parseOllamaUsage(result.body);
    if (windows.length === 0) markUsageBackoff(args.providerId);
    const usage: ProviderUsage = {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows,
    };
    if (windows.length > 0) rememberUsage(args.providerId, usage);
    return windows.length > 0 ? usage : (cached ?? usage);
  } catch {
    markUsageBackoff(args.providerId);
    return cached ?? {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows: [],
    };
  }
}
