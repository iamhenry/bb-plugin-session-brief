import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const CARD_WIDTH_PX = 20 * 16; // w-20rem, must match SessionBriefCard
const CARD_MAX_HEIGHT_PX = 36 * 16; // max-h-36rem, must match SessionBriefCard
const CARD_GAP_PX = 12;
const PANE_GUTTER_PX = 24;
const MIN_PANE_WIDTH_PX = CARD_WIDTH_PX + PANE_GUTTER_PX;

// ponytail: header remounts per thread; keep last explicit hide/show per session
const preferredOpenByThread = new Map<string, boolean>();

function useCardAnchor() {
  const [timeline, setTimeline] = useState<HTMLElement | null>(null);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const [toc, setToc] = useState<HTMLElement | null>(null);
  const [maxCardHeight, setMaxCardHeight] = useState<number | null>(null);
  const [timelineWidth, setTimelineWidth] = useState<number | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const triggerRef = useCallback((el: HTMLButtonElement | null) => {
    if (!el) {
      setTimeline(null);
      setHeader(null);
      setToc(null);
      setMaxCardHeight(null);
      return;
    }
    setTimeline(
      el.closest<HTMLElement>(
        '[data-panel-id="thread-detail-timeline-panel"]',
      ),
    );
    setHeader(el.closest<HTMLElement>("header"));
  }, []);

  useEffect(() => {
    if (!timeline) return;
    const timelineEl = timeline;
    const group = timelineEl.closest<HTMLElement>("[data-panel-group]");
    let observedToc: HTMLElement | null = null;
    const observer = new ResizeObserver(measure);

    function measure() {
      const timelineRect = timelineEl.getBoundingClientRect();
      const groupWidth = group?.getBoundingClientRect().width;
      setTimelineWidth(timelineRect.width);
      setRightPanelOpen(
        groupWidth !== undefined && timelineRect.width < groupWidth - 1,
      );

      const nextToc =
        timelineEl.querySelector<HTMLElement>("[data-thread-toc]");
      if (nextToc !== observedToc) {
        if (observedToc) observer.unobserve(observedToc);
        observedToc = nextToc;
        if (observedToc) observer.observe(observedToc);
      }
      const rect = nextToc?.getBoundingClientRect();
      const visibleToc = rect && rect.width > 0 && rect.height > 0;
      setToc(visibleToc ? nextToc : null);
      setMaxCardHeight(
        visibleToc && header
          ? Math.max(
              0,
              Math.min(
                CARD_MAX_HEIGHT_PX,
                Math.floor(
                  rect.top -
                    header.getBoundingClientRect().bottom -
                    CARD_GAP_PX * 2,
                ),
              ),
            )
          : null,
      );
    }

    observer.observe(timelineEl);
    if (group) observer.observe(group);
    if (header) observer.observe(header);
    const mutations = new MutationObserver(() => {
      const nextToc =
        timelineEl.querySelector<HTMLElement>("[data-thread-toc]");
      if (nextToc !== observedToc) measure();
    });
    mutations.observe(timelineEl, { childList: true, subtree: true });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [header, timeline]);

  return {
    triggerRef,
    header,
    toc,
    maxCardHeight,
    timelineWidth,
    rightPanelOpen,
  };
}

export function SessionBriefHost({
  threadId,
  isCompactViewport,
}: {
  threadId: string;
  projectId: string | null;
  isCompactViewport: boolean;
}) {
  const [open, setOpen] = useState(
    () => preferredOpenByThread.get(threadId) ?? !isCompactViewport,
  );
  const brief = useSessionBrief(threadId, { live: open });
  const { threads } = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const navigate = useBbNavigate();
  const portalScope = usePortalScopeProps();
  const {
    triggerRef,
    header,
    toc,
    maxCardHeight,
    timelineWidth,
    rightPanelOpen,
  } = useCardAnchor();
  const wasUsable = useRef(true);
  const restoreWhenUsable = useRef(false);
  function handleOpenChange(nextOpen: boolean) {
    restoreWhenUsable.current = false;
    preferredOpenByThread.set(threadId, nextOpen);
    setOpen(nextOpen);
  }

  useEffect(() => {
    if (timelineWidth === null) return;
    const usable =
      !isCompactViewport &&
      !rightPanelOpen &&
      timelineWidth >= MIN_PANE_WIDTH_PX;
    if (wasUsable.current && !usable) {
      restoreWhenUsable.current = open;
      setOpen(false);
    } else if (!wasUsable.current && usable) {
      if (restoreWhenUsable.current) setOpen(true);
      restoreWhenUsable.current = false;
    }
    wasUsable.current = usable;
  }, [isCompactViewport, open, rightPanelOpen, timelineWidth]);

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
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button
          ref={triggerRef}
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
        <Popover.Portal container={toc ?? header ?? undefined}>
          <div
            {...portalScope}
            style={toc ? { right: 0, bottom: "calc(100% + 12px)" } : undefined}
            className={
              toc
                ? "absolute z-50 outline-none"
                : "absolute top-14 right-3 z-50 outline-none"
            }
          >
            <SessionBriefCard
              brief={cardBrief}
              maxHeight={maxCardHeight ?? undefined}
              onClose={() => handleOpenChange(false)}
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
