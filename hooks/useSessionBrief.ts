import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { ProjectBrief, SessionBrief } from "../contract";
import { SAMPLE_BRIEF } from "../fixtures/session-brief";
import { mergeBrief } from "../lib/mergeBrief";
import type { rpcContract } from "../server";

const FULL_REFRESH_MS = 30_000;
const BRIEF_DEBOUNCE_MS = 300;
const PROJECT_DEBOUNCE_MS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

  const briefInFlight = useRef(false);
  const briefQueued = useRef(false);
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;
  const refresh = useCallback(() => {
    if (briefInFlight.current) {
      briefQueued.current = true;
      return;
    }
    briefInFlight.current = true;
    const requestedId = threadId;
    void rpc
      .call("getBrief", { threadId: requestedId })
      .then((next) => {
        if (threadIdRef.current !== requestedId) return;
        setBrief((previous) => mergeBrief(previous, next));
      })
      .catch(() => {
        // Keep the last good snapshot; do not flash the fixture.
      })
      .finally(() => {
        briefInFlight.current = false;
        if (!briefQueued.current) return;
        briefQueued.current = false;
        if (threadIdRef.current === requestedId) refresh();
      });
  }, [rpc, threadId]);

  const briefTimer = useRef<number | null>(null);
  const scheduleBriefRefresh = useCallback(() => {
    if (briefTimer.current !== null) {
      window.clearTimeout(briefTimer.current);
    }
    briefTimer.current = window.setTimeout(() => {
      briefTimer.current = null;
      refresh();
    }, BRIEF_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (projectTimer.current !== null) {
        window.clearTimeout(projectTimer.current);
      }
      if (briefTimer.current !== null) {
        window.clearTimeout(briefTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    refresh();
    if (!live) return;
    const timer = window.setInterval(refresh, FULL_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [live, refresh]);

  useEffect(() => {
    if (!live) return;
    refreshProject();
  }, [live, refreshProject]);

  useRealtime("brief-changed", (payload) => {
    if (!live) return;
    if (!isRecord(payload) || !payload.threadId || payload.threadId === threadId) {
      scheduleBriefRefresh();
    }
  });

  useRealtime("project-changed", (payload) => {
    if (!live) return;
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
