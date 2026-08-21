import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { SessionBrief } from "../contract";
import { SAMPLE_BRIEF } from "../fixtures/session-brief";
import type { rpcContract } from "../server";

function isBriefChangedPayload(
  payload: unknown,
): payload is { threadId?: string } {
  return typeof payload === "object" && payload !== null;
}

function keepLastGoodUsage(
  previous: SessionBrief,
  next: SessionBrief,
): SessionBrief {
  if (previous.threadId !== next.threadId) return next;
  const prevPrimary = previous.providers[0];
  const nextPrimary = next.providers[0];
  if (
    prevPrimary &&
    nextPrimary &&
    prevPrimary.id === nextPrimary.id &&
    prevPrimary.windows.length > 0 &&
    nextPrimary.windows.length === 0
  ) {
    return { ...next, providers: previous.providers };
  }
  return next;
}

export function useSessionBrief(threadId: string): SessionBrief {
  const rpc = useRpc<typeof rpcContract>();
  const [brief, setBrief] = useState<SessionBrief>({
    ...SAMPLE_BRIEF,
    threadId,
  });

  const refresh = useCallback(() => {
    void rpc
      .call("getBrief", { threadId })
      .then((next) => {
        setBrief((previous) => keepLastGoodUsage(previous, next));
      })
      .catch(() => {
        // Keep the last good snapshot; do not flash the fixture.
      });
  }, [rpc, threadId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useRealtime("brief-changed", (payload) => {
    if (!isBriefChangedPayload(payload)) {
      refresh();
      return;
    }
    if (!payload.threadId || payload.threadId === threadId) {
      refresh();
    }
  });

  return brief;
}
