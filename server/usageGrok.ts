import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProviderUsage } from "../contract";
import {
  parseGrokBillingBody,
  parseGrokUserTier,
  pickGrokAuth,
} from "./grokAuth";

const GROK_BILLING_URL =
  "https://cli-chat-proxy.grok.com/v1/billing?format=credits";
const GROK_USER_URL =
  "https://cli-chat-proxy.grok.com/v1/user?include=subscription";
const FETCH_MS = 3_000;
const SIGN_IN_MESSAGE =
  "Sign in to Grok in Pi or OpenCode to see usage.";
const EXPIRED_MESSAGE =
  "Grok session expired. Sign in again in Pi or OpenCode.";

function grokHome(home: string): string {
  const fromEnv = process.env.GROK_HOME;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  return join(home, ".grok");
}

function piAuthPath(home: string): string {
  const fromEnv = process.env.PI_CODING_AGENT_DIR;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return join(fromEnv, "auth.json");
  }
  return join(home, ".pi", "agent", "auth.json");
}

function openCodeAuthPath(home: string): string {
  const xdg = process.env.XDG_DATA_HOME;
  if (typeof xdg === "string" && xdg.length > 0) {
    return join(xdg, "opencode", "auth.json");
  }
  return join(home, ".local", "share", "opencode", "auth.json");
}

function authCandidates(home: string): string[] {
  const paths = [
    join(grokHome(home), "auth.json"),
    piAuthPath(home),
    openCodeAuthPath(home),
  ];
  return [...new Set(paths)];
}

function rootFor(path: string, home: string): string {
  if (path === home || path.startsWith(`${home}/`) || path.startsWith(`${home}\\`)) {
    return home;
  }
  return dirname(path);
}

async function hostHome(
  bb: BbPluginApi,
  hostId: string | undefined,
): Promise<string> {
  if (hostId) {
    try {
      const dir = await bb.sdk.hosts.directory({ hostId });
      if (typeof dir.directory === "string" && dir.directory.length > 0) {
        return dir.directory;
      }
    } catch {
      // Fall back to the plugin process home.
    }
  }
  return homedir();
}

async function readAuthJson(
  bb: BbPluginApi,
  hostId: string | undefined,
  path: string,
  rootPath: string,
): Promise<unknown | null> {
  try {
    const file = await bb.sdk.files.read({
      hostId,
      path,
      rootPath,
    });
    const text =
      file.contentEncoding === "base64"
        ? Buffer.from(file.content, "base64").toString("utf8")
        : file.content;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function grokGet(url: string, token: string): Promise<{
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

export async function grokUsage(args: {
  bb: BbPluginApi;
  hostId: string | undefined;
  providerId: string;
  contextPercent: number | null;
}): Promise<ProviderUsage> {
  const base = {
    id: args.providerId,
    name: "Grok",
  };

  const home = await hostHome(args.bb, args.hostId);
  let expired = false;
  let planHint: string | null = null;
  let token: string | null = null;

  for (const path of authCandidates(home)) {
    const raw = await readAuthJson(
      args.bb,
      args.hostId,
      path,
      rootFor(path, home),
    );
    if (raw === null) continue;
    const picked = pickGrokAuth(raw);
    if (!picked) continue;
    if (picked.meta.expired) {
      expired = true;
      planHint = picked.meta.planHint ?? planHint;
      continue;
    }
    token = picked.token;
    planHint = picked.meta.planHint ?? planHint;
    break;
  }

  if (!token) {
    return {
      ...base,
      status: expired ? "expired" : "unauthenticated",
      planLabel: planHint,
      message: expired ? EXPIRED_MESSAGE : SIGN_IN_MESSAGE,
      windows: [],
    };
  }

  try {
    const [billing, user] = await Promise.all([
      grokGet(GROK_BILLING_URL, token),
      grokGet(GROK_USER_URL, token),
    ]);

    if (billing.status === 401 || billing.status === 403) {
      return {
        ...base,
        status: "unauthenticated",
        planLabel: planHint,
        message: SIGN_IN_MESSAGE,
        windows: [],
      };
    }

    if (billing.status < 200 || billing.status >= 300 || billing.body === null) {
      return {
        ...base,
        status: "ok",
        planLabel: parseGrokUserTier(user.body) ?? planHint,
        message: null,
        windows: [],
      };
    }

    const parsed = parseGrokBillingBody(billing.body);
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
      planLabel: parseGrokUserTier(user.body) ?? planHint,
      message: null,
      windows,
    };
  } catch {
    return {
      ...base,
      status: "ok",
      planLabel: planHint,
      message: null,
      windows: [],
    };
  }
}
