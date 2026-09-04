import type { DirtyFile, SessionBrief } from "../../contract";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ChildrenSection } from "./sections/ChildrenSection";
import { ContextSection } from "./sections/ContextSection";
import { ProjectSection } from "./sections/ProjectSection";
import { TasksSection } from "./sections/TasksSection";
import { TodosSection } from "./sections/TodosSection";
import { UsageSection } from "./sections/UsageSection";

export function SessionBriefCard({
  brief,
  maxHeight,
  onClose,
  onOpenChild,
  onOpenDirtyFile,
}: {
  brief: SessionBrief;
  maxHeight?: number;
  onClose: () => void;
  onOpenChild?: (threadId: string) => void;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  return (
    <aside
      aria-label="Session Brief"
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className="flex max-h-[min(36rem,calc(100vh-7rem))] w-[20rem] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md"
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
