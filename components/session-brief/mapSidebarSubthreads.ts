import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { ChildThread } from "../../contract";
import { colorSlotFromId } from "../../lib/format";

function isBusy(thread: PluginSidebarThread): boolean {
  const { activity, indicator } = thread;
  if (
    activity.workflows +
      activity.backgroundAgents +
      activity.backgroundCommands +
      activity.planMode +
      activity.goals >
    0
  ) {
    return true;
  }
  return (
    indicator === "runtime" ||
    indicator === "workflow" ||
    indicator === "background-agent" ||
    indicator === "background-command"
  );
}

export function mapSidebarSubthreads(
  threads: readonly PluginSidebarThread[],
  parentThreadId: string,
): ChildThread[] {
  return threads
    .filter((thread) => thread.parentThreadId === parentThreadId)
    .map((thread) => {
      let status: ChildThread["status"] = "done";
      if (
        thread.hasPendingInteraction ||
        thread.indicator === "waiting-for-input"
      ) {
        status = "needs_input";
      } else if (thread.indicator === "unread-error") {
        status = "error";
      } else if (isBusy(thread)) {
        status = "running";
      }

      return {
        id: thread.id,
        title: thread.title ?? thread.titleFallback ?? "Untitled thread",
        status,
        providerId: thread.providerId,
        colorSlot: colorSlotFromId(thread.id),
        startedAtMs: thread.createdAt,
      };
    });
}

/** Sidebar rows lack thread.status; RPC list has error/idle. Prefer RPC terminal states. */
export function mergeSubthreads(
  fromRpc: readonly ChildThread[],
  fromSidebar: readonly ChildThread[],
): ChildThread[] {
  if (fromSidebar.length === 0) return [...fromRpc];
  const rpcById = new Map(fromRpc.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const merged = fromSidebar.map((row) => {
    seen.add(row.id);
    const rpc = rpcById.get(row.id);
    if (rpc?.status === "error" || rpc?.status === "needs_input") {
      return { ...row, status: rpc.status, title: rpc.title || row.title };
    }
    if (row.status === "running") return row;
    if (rpc) return { ...row, status: rpc.status };
    return row;
  });
  for (const row of fromRpc) {
    if (!seen.has(row.id)) merged.push(row);
  }
  return merged;
}
