import type { TodoItem, TodoStatus } from "../../../contract";
import { todoProgress } from "../../../lib/format";
import { cn } from "../../../lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";
import { SectionHeader } from "../SectionHeader";

const TODO_ICON: Record<TodoStatus, IconName> = {
  completed: "CircleCheck",
  in_progress: "Circle",
  pending: "Circle",
};

function TodoRow({ todo }: { todo: TodoItem }) {
  const done = todo.status === "completed";
  return (
    <div className="flex items-start gap-2 px-1 py-1">
      <Icon
        name={TODO_ICON[todo.status]}
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          done ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 text-[11px] leading-4",
          done ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {todo.text}
      </span>
    </div>
  );
}

export function TodosSection({ todos }: { todos: readonly TodoItem[] }) {
  const { done, total } = todoProgress(todos);
  return (
    <section className="border-t border-border px-2.5 py-1 pb-2">
      <SectionHeader
        icon="ListTodo"
        title="Todos"
        accessory={total === 0 ? "0" : `${done}/${total}`}
      />
      {todos.length === 0 ? (
        <p className="px-1 py-1.5 text-[11px] leading-4 text-muted-foreground">
          No todos on this thread
        </p>
      ) : (
        todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)
      )}
    </section>
  );
}
