import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { z } from "zod";
import { loadProjectTasks } from "./tasks.ts";

const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

type RpcCall = {
  method: string;
  input?: unknown;
  outputSchema: z.ZodType<unknown>;
};

function fakeBb(
  handler: (call: RpcCall) => unknown | Promise<unknown>,
): { bb: BbPluginApi; calls: RpcCall[] } {
  const calls: RpcCall[] = [];
  return {
    calls,
    bb: {
      sdk: {
        plugins: {
          callRpc: async (call: RpcCall) => {
            calls.push(call);
            return call.outputSchema.parse(await handler(call));
          },
        },
      },
    } as unknown as BbPluginApi,
  };
}

describe("loadProjectTasks", () => {
  it("omits Tasks without an exact BB project link", async () => {
    const { bb, calls } = fakeBb(() => ({
      projects: [{ id: "task-project", linkedBbProjectId: "proj_other" }],
    }));

    assert.equal(await loadProjectTasks(bb, "proj_current"), null);
    assert.deepEqual(calls.map((call) => call.method), ["listProjects"]);
  });

  it("returns an empty section for a linked project with no tasks", async () => {
    const { bb, calls } = fakeBb((call) =>
      call.method === "listProjects"
        ? {
            projects: [
              { id: "task-project", linkedBbProjectId: "proj_current" },
            ],
          }
        : { tasks: [], nextCursor: null },
    );

    assert.deepEqual(await loadProjectTasks(bb, "proj_current"), []);
    assert.deepEqual(calls.map((call) => call.method), [
      "listProjects",
      "listTasks",
    ]);
  });

  it("paginates only top-level linked-project tasks and preserves order", async () => {
    const task = (index: number) => ({
      id: `task-${index}`,
      projectId: "task-project",
      key: `SBR-${index}`,
      title: `Task ${index}`,
      status: TASK_STATUSES[index - 1],
    });
    const { bb, calls } = fakeBb((call) => {
      if (call.method === "listProjects") {
        return {
          projects: [
            { id: "unlinked", linkedBbProjectId: "proj_other" },
            { id: "task-project", linkedBbProjectId: "proj_current" },
          ],
        };
      }
      if (call.method === "listTasks") {
        const input = call.input as { cursor?: string };
        return input.cursor
          ? { tasks: [task(4), task(5), task(6)], nextCursor: null }
          : {
              tasks: [
                task(1),
                task(2),
                task(3),
                { ...task(6), id: "leaked", projectId: "unlinked" },
              ],
              nextCursor: "page-2",
            };
      }
      const taskId = (call.input as { taskId: string }).taskId;
      return {
        taskThreads: [
          { liveStatus: taskId === "task-3" ? "working" : "completed" },
        ],
      };
    });

    const result = await loadProjectTasks(bb, "proj_current");
    assert.deepEqual(
      result?.map(({ key, status, active }) => ({ key, status, active })),
      TASK_STATUSES.map((status, index) => ({
        key: `SBR-${index + 1}`,
        status,
        active: index === 2,
      })),
    );
    const listCalls = calls.filter((call) => call.method === "listTasks");
    assert.equal(listCalls.length, 2);
    for (const call of listCalls) {
      assert.deepEqual(call.input, {
        projectId: "task-project",
        parentTaskId: null,
        sort: "manual",
        limit: 500,
        ...(call === listCalls[1] ? { cursor: "page-2" } : {}),
      });
    }
    assert.equal(
      calls.some(
        (call) =>
          call.method === "listTaskThreads" &&
          (call.input as { taskId: string }).taskId === "leaked",
      ),
      false,
    );
  });

  it("hides only the Tasks subsection on thread lookup failure", async () => {
    const { bb } = fakeBb((call) => {
      if (call.method === "listProjects") {
        return {
          projects: [
            { id: "task-project", linkedBbProjectId: "proj_current" },
          ],
        };
      }
      if (call.method === "listTasks") {
        return {
          tasks: [
            {
              id: "task-1",
              projectId: "task-project",
              key: "SBR-1",
              title: "Broken thread lookup",
              status: "todo",
            },
          ],
          nextCursor: null,
        };
      }
      throw new Error("Tasks unavailable");
    });

    assert.equal(await loadProjectTasks(bb, "proj_current"), null);
  });

  it("bounds concurrent thread lookups and preserves task order", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 10 }, (_, index) => ({
      id: `task-${index + 1}`,
      projectId: "task-project",
      key: `SBR-${index + 1}`,
      title: `Task ${index + 1}`,
      status: "todo" as const,
    }));
    const { bb } = fakeBb(async (call) => {
      if (call.method === "listProjects") {
        return {
          projects: [
            { id: "task-project", linkedBbProjectId: "proj_current" },
          ],
        };
      }
      if (call.method === "listTasks") {
        return { tasks, nextCursor: null };
      }
      const taskId = (call.input as { taskId: string }).taskId;
      const taskNumber = Number(taskId.slice("task-".length));
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 9 - (taskNumber % 8)));
      inFlight -= 1;
      return { taskThreads: [{ liveStatus: "completed" }] };
    });

    const result = await loadProjectTasks(bb, "proj_current");
    assert.equal(maxInFlight, 8);
    assert.deepEqual(
      result?.map((task) => task.key),
      tasks.map((task) => task.key),
    );
  });

  it("hides the Tasks subsection on malformed cross-plugin data", async () => {
    const { bb } = fakeBb(() => ({
      projects: [{ id: 42, linkedBbProjectId: "proj_current" }],
    }));

    assert.equal(await loadProjectTasks(bb, "proj_current"), null);
  });
});
