import type { ProviderUsage } from "../contract";

const TTL_MS = 10 * 60_000;
const BACKOFF_MS = 60_000;

type Entry = {
  usage: ProviderUsage;
  at: number;
  backoffUntil: number;
};

const store = new Map<string, Entry>();

export function rememberUsage(key: string, usage: ProviderUsage): void {
  if (usage.windows.length === 0) return;
  const previous = store.get(key);
  store.set(key, {
    usage,
    at: Date.now(),
    backoffUntil: previous?.backoffUntil ?? 0,
  });
}

export function recallUsage(key: string): ProviderUsage | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.usage;
}

export function markUsageBackoff(key: string): void {
  const entry = store.get(key);
  const until = Date.now() + BACKOFF_MS;
  if (entry) {
    entry.backoffUntil = until;
    return;
  }
  store.set(key, {
    usage: {
      id: key,
      name: key,
      status: "ok",
      planLabel: null,
      message: null,
      windows: [],
    },
    at: 0,
    backoffUntil: until,
  });
}

export function usageFetchDue(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  if (Date.now() < entry.backoffUntil) return false;
  if (entry.usage.windows.length > 0 && Date.now() - entry.at < TTL_MS) {
    return false;
  }
  return true;
}
