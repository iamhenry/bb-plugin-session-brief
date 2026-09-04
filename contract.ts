import { z } from "zod";

/** 1–6 maps to host `bg-chart-*` tokens. Never store hex in the brief. */
export const childColorSlotSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const contextUsageSchema = z.object({
  usedTokens: z.number().nonnegative(),
  modelContextWindow: z.number().nonnegative(),
  estimated: z.boolean(),
});

export const usageWindowSchema = z.object({
  label: z.string(),
  usedPercent: z.number().min(0).max(100),
  resetsAt: z.string().nullable(),
  cost: z
    .object({
      usedUsdCents: z.number().int().nonnegative(),
      limitUsdCents: z.number().int().nonnegative(),
    })
    .optional(),
});

export const providerUsageSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum([
    "ok",
    "not_installed",
    "unauthenticated",
    "expired",
    "error",
  ]),
  planLabel: z.string().nullable(),
  message: z.string().nullable(),
  windows: z.array(usageWindowSchema),
});

export const childThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["running", "idle", "done", "error", "needs_input"]),
  providerId: z.string(),
  colorSlot: childColorSlotSchema,
  startedAtMs: z.number().nullable(),
});

export const todoItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
});

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

export const taskBriefSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  active: z.boolean(),
});

export const dirtyFileSchema = z.object({
  path: z.string(),
  status: z.string(),
  staged: z.boolean(),
  insertions: z.number().int().nonnegative().nullable(),
  deletions: z.number().int().nonnegative().nullable(),
});

export const projectBriefSchema = z.object({
  name: z.string(),
  branch: z.string().nullable(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  git: z.boolean(),
  environmentId: z.string().nullable(),
  gitActions: z.boolean(),
  insertions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  dirtyFiles: z.array(dirtyFileSchema),
});

export const sessionBriefSchema = z.object({
  threadId: z.string(),
  providerId: z.string(),
  model: z.string(),
  context: contextUsageSchema,
  project: projectBriefSchema,
  providers: z.array(providerUsageSchema),
  children: z.array(childThreadSchema),
  tasks: z.array(taskBriefSchema).nullable(),
  todos: z.array(todoItemSchema),
});

export type ContextUsage = z.infer<typeof contextUsageSchema>;
export type UsageWindow = z.infer<typeof usageWindowSchema>;
export type ProviderUsage = z.infer<typeof providerUsageSchema>;
export type ChildThread = z.infer<typeof childThreadSchema>;
export type TodoItem = z.infer<typeof todoItemSchema>;
export type TaskBrief = z.infer<typeof taskBriefSchema>;
export type DirtyFile = z.infer<typeof dirtyFileSchema>;
export type ProjectBrief = z.infer<typeof projectBriefSchema>;
export type SessionBrief = z.infer<typeof sessionBriefSchema>;
export type ChildStatus = ChildThread["status"];
export type TodoStatus = TodoItem["status"];
export type TaskStatus = TaskBrief["status"];
export type ProviderUsageStatus = ProviderUsage["status"];
export type ChildColorSlot = z.infer<typeof childColorSlotSchema>;
