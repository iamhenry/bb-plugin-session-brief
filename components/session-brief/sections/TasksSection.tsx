import { useState } from "react";
import {
  TASK_STATUSES,
  type TaskBrief,
  type TaskStatus,
} from "../../../contract";
import { Icon } from "../../ui/icon";
import { cn } from "../../../lib/utils";
import { SectionHeader } from "../SectionHeader";

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "text-subtle-foreground",
  todo: "text-subtle-foreground",
  in_progress: "text-attention",
  in_review: "text-timeline-accent",
  done: "text-success",
  canceled: "text-subtle-foreground",
};

function TaskStatusIcon({ status }: { status: TaskStatus }) {
  const ring = (
    <circle
      cx="7"
      cy="7"
      r="5.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeDasharray={status === "backlog" ? "1.8 2" : undefined}
    />
  );
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden
      className={cn("size-3.5 shrink-0", STATUS_COLOR[status])}
    >
      {status === "done" || status === "canceled" ? (
        <circle cx="7" cy="7" r="6" fill="currentColor" />
      ) : (
        ring
      )}
      {status === "in_progress" ? (
        <path d="M7 7 L7 2.4 A4.6 4.6 0 0 1 11.2 9.5 Z" fill="currentColor" />
      ) : null}
      {status === "in_review" ? (
        <path d="M7 7 L7 2.4 A4.6 4.6 0 1 1 6.99 2.4 Z" fill="currentColor" />
      ) : null}
      {status === "done" ? (
        <path
          d="M4.4 7.2 l1.8 1.8 3.4-3.8"
          fill="none"
          stroke="var(--background)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : null}
      {status === "canceled" ? (
        <path
          d="M5 5 l4 4 M9 5 l-4 4"
          stroke="var(--background)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

// Tasks owns this internal panel route. Keep the coupling in one replaceable helper.
export function taskDetailHref(taskKey: string): string {
  return `/plugins/tasks/tasks/task/${encodeURIComponent(taskKey)}`;
}

function TaskRow({ task }: { task: TaskBrief }) {
  return (
    <a
      href={taskDetailHref(task.key)}
      aria-label={`Open ${task.key}: ${task.title}`}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[11px] leading-4 hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="w-11 shrink-0 truncate tabular-nums text-muted-foreground">
        {task.key}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {task.title}
      </span>
      {task.active ? (
        <span className="flex shrink-0 items-center gap-1 text-success">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          Active
        </span>
      ) : null}
    </a>
  );
}

function StatusGroup({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: readonly TaskBrief[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
        className="flex h-7 w-full items-center gap-1.5 rounded-md px-1 text-left text-[11px] leading-4 text-muted-foreground hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <TaskStatusIcon status={status} />
        <span className="font-medium text-foreground">{STATUS_LABEL[status]}</span>
        <Icon
          name={collapsed ? "ChevronRight" : "ChevronDown"}
          className="size-3 shrink-0"
          aria-hidden
        />
        <span className="ml-auto tabular-nums">{tasks.length}</span>
      </button>
      {collapsed
        ? null
        : tasks.map((task) => <TaskRow key={task.id} task={task} />)}
    </div>
  );
}

export function TasksSection({ tasks }: { tasks: readonly TaskBrief[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="border-t border-border px-2.5 py-1">
      <SectionHeader
        icon="ListTodo"
        title="Tasks"
        accessory={tasks.length}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {collapsed ? null : tasks.length === 0 ? (
        <p className="px-1 py-1.5 text-[11px] leading-4 text-muted-foreground">
          No tasks in this project
        </p>
      ) : (
        <div className="pb-1">
          {TASK_STATUSES.map((status) => {
            const statusTasks = tasks.filter((task) => task.status === status);
            return statusTasks.length > 0 ? (
              <StatusGroup key={status} status={status} tasks={statusTasks} />
            ) : null;
          })}
        </div>
      )}
    </section>
  );
}
