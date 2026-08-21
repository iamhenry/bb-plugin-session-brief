import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProviderUsage } from "../contract";
import { loadPiOpenCodeAuth, pickNamedOauthAccess } from "./authFiles";
import { parseChatgptUsage } from "./usageChatgptParse";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const FETCH_MS = 3_000;

async function getJson(url: string, token: string): Promise<{
  status: number;
  body: unknown | null;
}> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
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

export async function chatgptUsage(args: {
  bb: BbPluginApi;
  hostId: string | undefined;
  displayName: string;
  id: string;
}): Promise<ProviderUsage> {
  const bags = await loadPiOpenCodeAuth(args.bb, args.hostId);
  const picked = pickNamedOauthAccess(bags, ["openai-codex", "openai"]);
  const base = { id: args.id, name: args.displayName };

  if (!picked || picked.expired || !picked.token) {
    return {
      ...base,
      status: picked?.expired ? "expired" : "unauthenticated",
      planLabel: null,
      message: "Sign in to ChatGPT/Codex in Pi or OpenCode to see usage.",
      windows: [],
    };
  }

  try {
    const result = await getJson(USAGE_URL, picked.token);
    if (result.status === 401 || result.status === 403) {
      return {
        ...base,
        status: "unauthenticated",
        planLabel: null,
        message: "Sign in to ChatGPT/Codex in Pi or OpenCode to see usage.",
        windows: [],
      };
    }
    const parsed = parseChatgptUsage(result.body);
    const windows =
      parsed.usedPercent === null
        ? []
        : [
            {
              label: parsed.windowLabel,
              usedPercent: parsed.usedPercent,
              resetsAt: parsed.resetsAt,
            },
          ];
    return {
      ...base,
      status: "ok",
      planLabel: parsed.planLabel,
      message: null,
      windows,
    };
  } catch {
    return {
      ...base,
      status: "ok",
      planLabel: null,
      message: null,
      windows: [],
    };
  }
}
