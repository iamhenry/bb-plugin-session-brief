import { useState } from "react";
import type { DirtyFile, SessionBrief } from "../../contract";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ChildrenSection } from "./sections/ChildrenSection";
import {
  ContextSection,
  contextHeadline,
} from "./sections/ContextSection";
import { ProjectSection } from "./sections/ProjectSection";
import { TasksSection } from "./sections/TasksSection";
import { TodosSection, todoHeadline } from "./sections/TodosSection";
import { UsageSection, usageHeadline } from "./sections/UsageSection";

type StripSection =
  | "context"
  | "project"
  | "usage"
  | "children"
  | "tasks"
  | "todos";

function SummaryCell({
  label,
  value,
  expanded,
  detailsId,
  onSelect,
}: {
  label: string;
  value: string;
  expanded?: boolean;
  detailsId?: string;
  onSelect?: () => void;
}) {
  const className =
    "min-w-[6rem] max-w-[14rem] flex-1 border-r border-border px-3 py-1.5 text-left last:border-r-0";
  if (!onSelect) {
    return (
      <div className={className} title={value}>
        <div className="truncate text-[10px] leading-3 text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-[11px] leading-4 text-foreground">
          {value}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${className} font-normal hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring`}
      aria-expanded={expanded}
      aria-controls={detailsId}
      onClick={onSelect}
      title={value}
    >
      <div className="truncate text-[10px] leading-3 text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-[11px] leading-4 text-foreground">
        {value}
      </div>
    </button>
  );
}

function StripDetails({
  section,
  brief,
  onOpenChild,
  onOpenDirtyFile,
}: {
  section: StripSection;
  brief: SessionBrief;
  onOpenChild?: (threadId: string) => void;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  switch (section) {
    case "context":
      return <ContextSection context={brief.context} />;
    case "project":
      return (
        <ProjectSection
          project={brief.project}
          onOpenDirtyFile={onOpenDirtyFile}
        />
      );
    case "usage":
      return <UsageSection providers={brief.providers} />;
    case "children":
      return (
        <ChildrenSection items={brief.children} onOpenChild={onOpenChild} />
      );
    case "tasks":
      return brief.tasks === null ? null : <TasksSection tasks={brief.tasks} />;
    case "todos":
      return <TodosSection todos={brief.todos} />;
  }
}

function SessionBriefStrip({
  brief,
  onClose,
  onOpenChild,
  onOpenDirtyFile,
}: {
  brief: SessionBrief;
  onClose: () => void;
  onOpenChild?: (threadId: string) => void;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  const [expandedSection, setExpandedSection] =
    useState<StripSection | null>(null);
  const activeSection =
    expandedSection === "tasks" && brief.tasks === null
      ? null
      : expandedSection;
  const project = brief.project.branch
    ? `${brief.project.name} · ${brief.project.branch}`
    : brief.project.name;
  const selectSection = (section: StripSection) => {
    setExpandedSection((current) => (current === section ? null : section));
  };
  const detailsId = "session-brief-strip-details";

  return (
    <aside
      aria-label="Session Brief"
      className="w-full min-w-0 overflow-hidden border-y border-border bg-card text-card-foreground"
    >
      <div className="flex min-w-0 items-stretch">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          <SummaryCell label="Session" value={brief.model} />
          <SummaryCell
            label="Context"
            value={contextHeadline(brief.context)}
            expanded={activeSection === "context"}
            detailsId={detailsId}
            onSelect={() => selectSection("context")}
          />
          <SummaryCell
            label="Project"
            value={project}
            expanded={activeSection === "project"}
            detailsId={detailsId}
            onSelect={() => selectSection("project")}
          />
          <SummaryCell
            label="Usage"
            value={usageHeadline(brief.providers[0])}
            expanded={activeSection === "usage"}
            detailsId={detailsId}
            onSelect={() => selectSection("usage")}
          />
          <SummaryCell
            label="Subthreads"
            value={String(brief.children.length)}
            expanded={activeSection === "children"}
            detailsId={detailsId}
            onSelect={() => selectSection("children")}
          />
          {brief.tasks === null ? null : (
            <SummaryCell
              label="Tasks"
              value={String(brief.tasks.length)}
              expanded={activeSection === "tasks"}
              detailsId={detailsId}
              onSelect={() => selectSection("tasks")}
            />
          )}
          <SummaryCell
            label="Todos"
            value={todoHeadline(brief.todos)}
            expanded={activeSection === "todos"}
            detailsId={detailsId}
            onSelect={() => selectSection("todos")}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Hide Session Brief"
          className="m-1 size-7 shrink-0 text-muted-foreground"
          onClick={onClose}
        >
          <Icon name="X" className="size-3.5" aria-hidden />
        </Button>
      </div>
      {activeSection ? (
        <div
          id={detailsId}
          className="max-h-[min(36rem,calc(100vh-7rem))] overflow-y-auto border-t border-border"
        >
          <StripDetails
            section={activeSection}
            brief={brief}
            onOpenChild={onOpenChild}
            onOpenDirtyFile={onOpenDirtyFile}
          />
        </div>
      ) : null}
    </aside>
  );
}

export function SessionBriefCard({
  brief,
  layout = "card",
  maxHeight,
  onClose,
  onOpenChild,
  onOpenDirtyFile,
}: {
  brief: SessionBrief;
  layout?: "card" | "strip";
  maxHeight?: number;
  onClose: () => void;
  onOpenChild?: (threadId: string) => void;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  if (layout === "strip") {
    return (
      <SessionBriefStrip
        brief={brief}
        onClose={onClose}
        onOpenChild={onOpenChild}
        onOpenDirtyFile={onOpenDirtyFile}
      />
    );
  }

  return (
    <aside
      aria-label="Session Brief"
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className="flex max-h-[min(36rem,calc(100vh-7rem))] w-[17.5rem] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md"
    >
      <header className="flex shrink-0 items-center gap-1 px-2.5 pt-2">
        <h2 className="min-w-0 flex-1 px-1 text-xs font-medium text-foreground">
          Session
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Hide Session Brief"
          className="size-7 text-muted-foreground"
          onClick={onClose}
        >
          <Icon name="X" className="size-3.5" aria-hidden />
        </Button>
      </header>
      <div className="min-h-0 overflow-y-auto">
        <ContextSection context={brief.context} />
        <ProjectSection
          project={brief.project}
          onOpenDirtyFile={onOpenDirtyFile}
        />
        <UsageSection providers={brief.providers} />
        <ChildrenSection items={brief.children} onOpenChild={onOpenChild} />
        {brief.tasks === null ? null : <TasksSection tasks={brief.tasks} />}
        <TodosSection todos={brief.todos} />
      </div>
    </aside>
  );
}
