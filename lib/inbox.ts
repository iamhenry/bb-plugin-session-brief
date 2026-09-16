import type { ChildThread } from "../contract";

/** OpenChamber "Recent" shape: unpinned threads linger 48h after activity. */
export const INBOX_RETENTION_MS = 48 * 60 * 60 * 1000;

/**
 * Inbox membership. Keep a thread that is pinned, needs attention
 * (running / needs_input / error), or was active within the retention
 * window. Unknown activity time keeps the row visible (defensive).
 * Order preserved — this filters, it never re-sorts.
 */
export function filterInbox(
  items: readonly ChildThread[],
  nowMs: number,
): ChildThread[] {
  const minMs = nowMs - INBOX_RETENTION_MS;
  return items.filter(
    (item) =>
      item.pinned ||
      item.lastActivityMs === null ||
      item.lastActivityMs >= minMs ||
      item.status === "running" ||
      item.status === "needs_input" ||
      item.status === "error",
  );
}