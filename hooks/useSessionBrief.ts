import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { ProjectBrief, SessionBrief } from "../contract";
import { SAMPLE_BRIEF } from "../fixtures/session-brief";
import type { rpcContract } from "../server";

const FULL_REFRESH_MS = 30_000;
const LIVE_PROJECT_POLL_MS = 2_000;
const PROJECT_DEBOUNCE_MS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function matchesProjectSignal(
  payload: unknown,
  args: { threadId: string; environmentId: string | null },
): boolean {
  if (!isRecord(payload)) return true;
  const threadId =
    typeof payload.threadId === "string" ? payload.threadId : null;
  const environmentId =
    typeof payload.environmentId === "string" ? payload.environmentId : null;
  if (threadId && threadId === args.threadId) return true;
  if (environmentId && environmentId === args.environmentId) return true;
  return !threadId && !environmentId;
}

export function useSessionBrief(
  threadId: string,
  opts?: { live?: boolean },
): SessionBrief {
  const live = opts?.live === true;
  const rpc = useRpc<typeof rpcContract>();
  const [brief, setBrief] = useState<SessionBrief>({
    ...SAMPLE_BRIEF,
    threadId,
  });
  const environmentIdRef = useRef<string | null>(brief.project.environmentId);
  environmentIdRef.current = brief.project.environmentId;

  const applyProject = useCallback((project: ProjectBrief) => {
    setBrief((previous) =>
      previous.threadId === threadId ? { ...previous, project } : previous,
    );
  }, [threadId]);

  const refreshProject = useCallback(() => {
    void rpc
      .call("getProject", { threadId })
      .then(applyProject)
      .catch(() => {
        // Keep the last good project snapshot.
      });
  }, [applyProject, rpc, threadId]);

  const projectTimer = useRef<number | null>(null);
  const scheduleProjectRefresh = useCallback(() => {
    if (projectTimer.current !== null) {
      window.clearTimeout(projectTimer.current);
    }
    projectTimer.current = window.setTimeout(() => {
      projectTimer.current = null;
      refreshProject();
    }, PROJECT_DEBOUNCE_MS);
  }, [refreshProject]);

  const refresh = useCallback(() => {
    void rpc
      .call("getBrief", { threadId })
      .then((next) => {
        setBrief((previous) => keepLastGoodUsage(previous, next));
        // Project was snapshotted before usage APIs; refresh it so a late
        // getBrief cannot clobber a newer dirty-file list.
        scheduleProjectRefresh();
      })
      .catch(() => {
        // Keep the last good snapshot; do not flash the fixture.
      });
  }, [rpc, scheduleProjectRefresh, threadId]);

  useEffect(() => {
    return () => {
      if (projectTimer.current !== null) {
        window.clearTimeout(projectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, FULL_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!live) return;
    refreshProject();
    const timer = window.setInterval(refreshProject, LIVE_PROJECT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [live, refreshProject]);

  useRealtime("brief-changed", (payload) => {
    if (!isRecord(payload) || !payload.threadId || payload.threadId === threadId) {
      refresh();
    }
  });

  useRealtime("project-changed", (payload) => {
    if (
      matchesProjectSignal(payload, {
        threadId,
        environmentId: environmentIdRef.current,
      })
    ) {
      scheduleProjectRefresh();
    }
  });

  return brief;
}
