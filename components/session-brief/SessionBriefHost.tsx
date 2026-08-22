import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreads,
  useBbNavigate,
} from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useSessionBrief } from "../../hooks/useSessionBrief";
import { usePortalScopeProps } from "../../lib/portal-scope";
import {
  mapSidebarSubthreads,
  mergeSubthreads,
} from "./mapSidebarSubthreads";
import { SessionBriefCard } from "./SessionBriefCard";

export function SessionBriefHost({
  threadId,
  isCompactViewport,
}: {
  threadId: string;
  projectId: string | null;
  isCompactViewport: boolean;
}) {
  const brief = useSessionBrief(threadId);
  const { threads } = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const navigate = useBbNavigate();
  const [open, setOpen] = useState(!isCompactViewport);
  const portalScope = usePortalScopeProps();

  useEffect(() => {
    if (isCompactViewport) setOpen(false);
  }, [isCompactViewport]);

  const liveChildren = useMemo(
    () => mapSidebarSubthreads(threads, threadId),
    [threads, threadId],
  );

  const cardBrief = useMemo(
    () => ({
      ...brief,
      children: mergeSubthreads(brief.children, liveChildren),
    }),
    [brief, liveChildren],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Hide Session Brief" : "Show Session Brief"}
          className="size-7"
        >
          <Icon name="SlidersHorizontal" className="size-4" aria-hidden />
        </Button>
      </Popover.Trigger>
      {open ? (
        <Popover.Portal>
          <div
            {...portalScope}
            className="fixed top-14 right-3 z-50 outline-none"
          >
            <SessionBriefCard
              brief={cardBrief}
              onClose={() => setOpen(false)}
              onOpenChild={(id) => {
                actions.open(id);
              }}
              onOpenDirtyFile={(file) => {
                const environmentId = brief.project.environmentId;
                if (!environmentId || !brief.project.git) return;
                navigate.openThreadPanel({
                  actionId: "dirty-file",
                  title: file.path.split("/").pop() ?? file.path,
                  params: { path: file.path, environmentId },
                });
              }}
            />
          </div>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}
