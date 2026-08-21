import type { ChildColorSlot, ChildStatus, ContextUsage, TodoItem } from "../contract";

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function contextPercent(context: ContextUsage): number {
  if (context.modelContextWindow <= 0) return 0;
  return clampPercent(
    (context.usedTokens / context.modelContextWindow) * 100,
  );
}

export function formatPercent(value: number, digits = 1): string {
  return `${clampPercent(value).toFixed(digits)}%`;
}

export function remainingPercent(usedPercent: number): number {
  return clampPercent(100 - usedPercent);
}

export function formatResetAt(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const resetMs = Date.parse(resetsAt);
  if (!Number.isFinite(resetMs)) return null;
  return new Date(resetMs).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatElapsed(startedAtMs: number, nowMs = Date.now()): string | null {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) return null;
  const elapsedMs = nowMs - startedAtMs;
  if (elapsedMs < 0) return null;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (elapsedSec < 60) return `${elapsedSec}s`;
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes === 0 ? `${hours}h` : `${hours}h ${remainMinutes}m`;
}

export function todoProgress(todos: readonly TodoItem[]): {
  done: number;
  total: number;
} {
  return {
    done: todos.filter((todo) => todo.status === "completed").length,
    total: todos.length,
  };
}

export const CHILD_STATUS_LABEL: Record<Exclude<ChildStatus, "running">, string> =
  {
    idle: "Idle",
    done: "Done",
    error: "Error",
    needs_input: "Needs input",
  };

export const CHILD_DOT_CLASS: Record<ChildColorSlot, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
  6: "bg-muted-foreground",
};

export function colorSlotFromId(id: string): ChildColorSlot {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 6;
  }
  return ((hash % 6) + 1) as ChildColorSlot;
}
