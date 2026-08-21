import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";

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

async function readJson(
  bb: BbPluginApi,
  hostId: string | undefined,
  path: string,
  rootPath: string,
): Promise<unknown | null> {
  try {
    const file = await bb.sdk.files.read({ hostId, path, rootPath });
    const text =
      file.contentEncoding === "base64"
        ? Buffer.from(file.content, "base64").toString("utf8")
        : file.content;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Pi then OpenCode auth.json. Never logs contents. */
export async function loadPiOpenCodeAuth(
  bb: BbPluginApi,
  hostId: string | undefined,
): Promise<unknown[]> {
  const home = await hostHome(bb, hostId);
  const paths = [...new Set([piAuthPath(home), openCodeAuthPath(home)])];
  const bags: unknown[] = [];
  for (const path of paths) {
    const raw = await readJson(bb, hostId, path, rootFor(path, home));
    if (raw !== null) bags.push(raw);
  }
  return bags;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expiresAtMs(expires: unknown): number | null {
  if (typeof expires !== "number" || !Number.isFinite(expires)) return null;
  // Pi/OpenCode may store seconds or milliseconds.
  return expires < 1e12 ? expires * 1000 : expires;
}

export function pickNamedOauthAccess(
  bags: readonly unknown[],
  names: readonly string[],
  nowMs = Date.now(),
): { token: string; expired: boolean } | null {
  let expiredToken: string | null = null;
  for (const bag of bags) {
    if (!isRecord(bag)) continue;
    for (const name of names) {
      const entry = bag[name];
      if (!isRecord(entry)) continue;
      const type = entry.type;
      if (typeof type === "string" && type !== "oauth") continue;
      const token = entry.access;
      if (typeof token !== "string" || token.length === 0) continue;
      const expMs = expiresAtMs(entry.expires);
      if (expMs !== null && expMs <= nowMs) {
        expiredToken = token;
        continue;
      }
      return { token, expired: false };
    }
  }
  // Still try the access token; HTTP 401 is the authority. Never refresh.
  if (expiredToken) return { token: expiredToken, expired: false };
  return null;
}
