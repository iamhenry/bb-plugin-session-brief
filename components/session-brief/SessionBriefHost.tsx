import { useCallback, useEffect, useMemo, useState } from "react";
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
  doesSessionBriefSideCardFit,
  isSessionBriefStripLayout,
} from "../../lib/sessionBriefLayout";
import {
  mapSidebarSubthreads,
  mergeSubthreads,
} from "./mapSidebarSubthreads";
import { SessionBriefCard } from "./SessionBriefCard";

const CARD_MAX_HEIGHT_PX = 36 * 16; // max-h-36rem, must match SessionBriefCard
const CARD_GAP_PX = 12;

// ponytail: header remounts per thread; keep last explicit hide/show per session
const preferredOpenByThread = new Map<string, boolean>();

function useCardAnchor() {
  const [timeline, setTimeline] = useState<HTMLElement | null>(null);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const [toc, setToc] = useState<HTMLElement | null>(null);
  const [stripContainer, setStripContainer] = useState<HTMLElement | null>(
    null,
  );
  const [maxCardHeight, setMaxCardHeight] = useState<number | null>(null);
  const [sideCardFits, setSideCardFits] = useState(false);
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
    if (!header?.parentElement) return;
    const slot = document.createElement("div");
    slot.dataset.sessionBriefStripSlot = "";
    slot.className = "contents";
    header.parentElement.insertBefore(slot, header.nextSibling);
    setStripContainer(slot);

    return () => {
      setStripContainer((current) => (current === slot ? null : current));
      slot.remove();
    };
  }, [header]);

  useEffect(() => {
    if (!timeline) return;
    const timelineEl = timeline;
    const group = timelineEl.closest<HTMLElement>("[data-panel-group]");
    let observedToc: HTMLElement | null = null;
    let observedTranscript: HTMLElement | null = null;
    const observer = new ResizeObserver(measure);

    function measure() {
      const timelineRect = timelineEl.getBoundingClientRect();
      const groupWidth = group?.getBoundingClientRect().width;
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
      const nextTranscript = timelineEl.querySelector<HTMLElement>(
        '[data-timeline-row-list="top-level"]',
      );
      if (nextTranscript !== observedTranscript) {
        if (observedTranscript) observer.unobserve(observedTranscript);
        observedTranscript = nextTranscript;
        if (observedTranscript) observer.observe(observedTranscript);
      }

      const tocRect = nextToc?.getBoundingClientRect();
      const visibleToc = tocRect && tocRect.width > 0 && tocRect.height > 0;
      setToc(visibleToc ? nextToc : null);
      const transcriptRect = nextTranscript?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const cardAnchorRight = visibleToc
        ? tocRect.right
        : (headerRect?.right ?? timelineRect.right) - CARD_GAP_PX;
      const availableGutter = transcriptRect
        ? cardAnchorRight - transcriptRect.right
        : null;
      setSideCardFits((currentlyFits) =>
        doesSessionBriefSideCardFit({ availableGutter, currentlyFits }),
      );
      setMaxCardHeight(
        visibleToc && header
          ? Math.max(
              0,
              Math.min(
                CARD_MAX_HEIGHT_PX,
                Math.floor(
                  tocRect.top -
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
      const nextTranscript = timelineEl.querySelector<HTMLElement>(
        '[data-timeline-row-list="top-level"]',
      );
      if (nextToc !== observedToc || nextTranscript !== observedTranscript) {
        measure();
      }
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
    stripContainer,
    maxCardHeight,
    sideCardFits,
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
  const [open, setOpen] = useState(() => {
    const preferred = preferredOpenByThread.get(threadId);
    if (preferred !== undefined) return preferred;
    const initialOpen = !isCompactViewport;
    preferredOpenByThread.set(threadId, initialOpen);
    return initialOpen;
  });
  const brief = useSessionBrief(threadId, { live: open });
  const { threads } = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const navigate = useBbNavigate();
  const portalScope = usePortalScopeProps();
  const {
    triggerRef,
    header,
    toc,
    stripContainer,
    maxCardHeight,
    sideCardFits,
    rightPanelOpen,
  } = useCardAnchor();

  const isStripLayout = isSessionBriefStripLayout({
    isCompactViewport,
    rightPanelOpen,
    sideCardFits,
  });

  function handleOpenChange(nextOpen: boolean) {
    preferredOpenByThread.set(threadId, nextOpen);
    setOpen(nextOpen);
  }

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
      {open && (!isStripLayout || stripContainer) ? (
        <Popover.Portal
          container={
            isStripLayout
              ? stripContainer ?? undefined
              : toc ?? header ?? undefined
          }
        >
          <div
            {...portalScope}
            style={
              !isStripLayout && toc
                ? { right: 0, bottom: "calc(100% + 12px)" }
                : undefined
            }
            className={
              isStripLayout
                ? "block w-full min-w-0 outline-none"
                : toc
                ? "absolute z-50 outline-none"
                : "absolute top-14 right-3 z-50 outline-none"
            }
          >
            <SessionBriefCard
              brief={cardBrief}
              layout={isStripLayout ? "strip" : "card"}
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
