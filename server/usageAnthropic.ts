import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProviderUsage } from "../contract";
import { loadPiOpenCodeAuth, pickNamedOauthAccess } from "./authFiles";
import {
  markUsageBackoff,
  recallUsage,
  rememberUsage,
  usageFetchDue,
} from "./usageCache";
import { parseAnthropicUsage } from "./usageAnthropicParse";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const FETCH_MS = 8_000;
const CACHE_KEY = "claude";

async function getJson(url: string, token: string): Promise<{
  status: number;
  body: unknown | null;
}> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
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

export async function anthropicUsage(args: {
  bb: BbPluginApi;
  hostId: string | undefined;
}): Promise<ProviderUsage> {
  const cached = recallUsage(CACHE_KEY);
  if (!usageFetchDue(CACHE_KEY) && cached) return cached;

  const bags = await loadPiOpenCodeAuth(args.bb, args.hostId);
  const picked = pickNamedOauthAccess(bags, ["anthropic"]);
  const base = { id: "claude", name: "Claude" };

  if (!picked || !picked.token) {
    return cached ?? {
      ...base,
      status: "unauthenticated",
      planLabel: null,
      message: "Sign in to Claude in Pi or OpenCode to see usage.",
      windows: [],
    };
  }

  try {
    const result = await getJson(USAGE_URL, picked.token);
    if (result.status === 429) {
      markUsageBackoff(CACHE_KEY);
      return cached ?? {
        ...base,
        status: "ok",
        planLabel: null,
        message: null,
        windows: [],
      };
    }
    if (result.status === 401 || result.status === 403) {
      return cached ?? {
        ...base,
        status: "unauthenticated",
        planLabel: null,
        message: "Sign in to Claude in Pi or OpenCode to see usage.",
        windows: [],
      };
    }
    if (result.status < 200 || result.status >= 300) {
      markUsageBackoff(CACHE_KEY);
      return cached ?? { ...base, status: "ok", planLabel: null, message: null, windows: [] };
    }
    const windows = parseAnthropicUsage(result.body);
    const usage: ProviderUsage = {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows,
    };
    rememberUsage(CACHE_KEY, usage);
    return windows.length > 0 ? usage : (cached ?? usage);
  } catch {
    markUsageBackoff(CACHE_KEY);
    return cached ?? {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows: [],
    };
  }
}
