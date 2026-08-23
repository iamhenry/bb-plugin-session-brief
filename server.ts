import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { projectBriefSchema, sessionBriefSchema } from "./contract";
import { SAMPLE_BRIEF } from "./fixtures/session-brief";
import { composeBrief, composeProject } from "./server/composeBrief";
import {
  isProjectEnvironmentChange,
  isProjectThreadChange,
} from "./server/projectSignals";

export const rpcContract = defineRpcContract({
  getBrief: {
    input: z.object({ threadId: z.string() }),
    output: sessionBriefSchema,
  },
  getProject: {
    input: z.object({ threadId: z.string() }),
    output: projectBriefSchema,
  },
  getDirtyFile: {
    input: z.object({
      environmentId: z.string(),
      path: z.string().min(1),
    }),
    output: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("diff"),
        path: z.string(),
        patch: z.string(),
      }),
      z.object({
        kind: z.literal("file"),
        path: z.string(),
        content: z.string(),
      }),
      z.object({
        kind: z.literal("missing"),
        path: z.string(),
      }),
    ]),
  },
});

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  const publishBrief = (threadId: string) => {
    bb.realtime.publish("brief-changed", { threadId });
  };
  const publishProject = (payload: {
    threadId?: string;
    environmentId?: string;
  }) => {
    bb.realtime.publish("project-changed", payload);
  };

  bb.events.on("thread.active", ({ thread }) => publishBrief(thread.id));
  bb.events.on("thread.idle", ({ thread }) => publishBrief(thread.id));
  bb.events.on("thread.failed", ({ thread }) => publishBrief(thread.id));
  bb.events.on("thread.created", ({ thread }) => {
    publishBrief(thread.id);
    if (thread.parentThreadId) publishBrief(thread.parentThreadId);
  });

  const unsubscribeEnvironment = bb.sdk.subscribe({
    event: "environment:changed",
    callback: (event) => {
      if (!isProjectEnvironmentChange(event.changes)) return;
      publishProject({ environmentId: event.id });
    },
  });
  const unsubscribeThread = bb.sdk.subscribe({
    event: "thread:changed",
    callback: (event) => {
      if (
        !isProjectThreadChange({
          changes: event.changes,
          eventTypes: event.metadata?.eventTypes,
        })
      ) {
        return;
      }
      if (event.id) publishProject({ threadId: event.id });
    },
  });

  bb.rpc.register(rpcContract, {
    getBrief: async ({ threadId }) => {
      try {
        return await composeBrief(bb, threadId);
      } catch (error) {
        bb.log.warn(
          `getBrief failed: ${error instanceof Error ? error.message : "unknown"}`,
        );
        return { ...SAMPLE_BRIEF, threadId };
      }
    },
    getProject: async ({ threadId }) => {
      return composeProject(bb, threadId);
    },
    getDirtyFile: async ({ environmentId, path }) => {
      try {
        const result = await bb.sdk.environments.diffPatch({
          environmentId,
          paths: [path],
          target: { type: "uncommitted" },
        });
        if (
          result &&
          typeof result === "object" &&
          "outcome" in result &&
          result.outcome === "available" &&
          Array.isArray(result.patches) &&
          typeof result.patches[0]?.patch === "string"
        ) {
          return {
            kind: "diff" as const,
            path,
            patch: result.patches[0].patch,
          };
        }
      } catch {
        // Fall through to a missing result rather than inventing a patch.
      }
      return { kind: "missing" as const, path };
    },
  });

  bb.onDispose(() => {
    unsubscribeEnvironment();
    unsubscribeThread();
    bb.log.info("disposed");
  });
}
