import type { BbPluginApi, JsonValue } from "@get-bb/plugin-sdk";
import { z } from "zod";
import type { TaskBrief } from "../contract";

const projectsResponseSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      linkedBbProjectId: z.string().nullable(),
    }),
  ),
});

const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  key: z.string(),
  title: z.string(),
  status: z.enum([
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "canceled",
  ]),
});

const tasksResponseSchema = z.object({
  tasks: z.array(taskSchema),
  nextCursor: z.string().nullable(),
});

const taskThreadsResponseSchema = z.object({
  taskThreads: z.array(
    z.object({
      liveStatus: z.enum([
        "starting",
        "working",
        "idle",
        "completed",
        "failed",
      ]),
    }),
  ),
});

const TASKS_PLUGIN_ID = "tasks";
const PAGE_LIMIT = 500;
const THREAD_LOOKUP_BATCH_SIZE = 8;

async function callTasks<T>(
  bb: BbPluginApi,
  method: string,
  input: JsonValue,
  outputSchema: z.ZodType<T>,
): Promise<T> {
  return bb.sdk.plugins.callRpc({
    pluginId: TASKS_PLUGIN_ID,
    method,
    input,
    outputSchema,
  });
}

async function listProjectTasks(
  bb: BbPluginApi,
  taskProjectId: string,
): Promise<z.infer<typeof taskSchema>[]> {
  const tasks: z.infer<typeof taskSchema>[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await callTasks(
      bb,
      "listTasks",
      {
        projectId: taskProjectId,
        parentTaskId: null,
        sort: "manual",
        limit: PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
      tasksResponseSchema,
    );
    tasks.push(...page.tasks.filter((task) => task.projectId === taskProjectId));
    cursor = page.nextCursor ?? undefined;
    if (cursor && seenCursors.has(cursor)) {
      throw new Error("Tasks pagination cursor repeated");
    }
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return tasks;
}

/** Returns null when no compatible Tasks project is linked to this BB project. */
export async function loadProjectTasks(
  bb: BbPluginApi,
  bbProjectId: string,
): Promise<TaskBrief[] | null> {
  try {
    const response = await callTasks(
      bb,
      "listProjects",
      {},
      projectsResponseSchema,
    );
    const projects = response.projects.filter(
      (project) => project.linkedBbProjectId === bbProjectId,
    );
    if (projects.length === 0) return null;

    const tasks = (
      await Promise.all(
        projects.map((project) => listProjectTasks(bb, project.id)),
      )
    ).flat();
    const result: TaskBrief[] = [];
    for (let index = 0; index < tasks.length; index += THREAD_LOOKUP_BATCH_SIZE) {
      result.push(
        ...(await Promise.all(
          tasks
            .slice(index, index + THREAD_LOOKUP_BATCH_SIZE)
            .map(async (task) => {
              const response = await callTasks(
                bb,
                "listTaskThreads",
                { taskId: task.id },
                taskThreadsResponseSchema,
              );
              return {
                id: task.id,
                key: task.key,
                title: task.title,
                status: task.status,
                active: response.taskThreads.some(
                  (thread) =>
                    thread.liveStatus === "starting" ||
                    thread.liveStatus === "working",
                ),
              };
            }),
        )),
      );
    }
    return result;
  } catch {
    return null;
  }
}
