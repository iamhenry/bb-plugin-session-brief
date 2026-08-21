import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { sessionBriefSchema } from "./contract";
import { SAMPLE_BRIEF } from "./fixtures/session-brief";
import { composeBrief } from "./server/composeBrief";

export const rpcContract = defineRpcContract({
  getBrief: {
    input: z.object({ threadId: z.string() }),
    output: sessionBriefSchema,
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

  const publish = (threadId: string) => {
    bb.realtime.publish("brief-changed", { threadId });
  };

  bb.events.on("thread.active", ({ thread }) => publish(thread.id));
  bb.events.on("thread.idle", ({ thread }) => publish(thread.id));
  bb.events.on("thread.failed", ({ thread }) => publish(thread.id));
  bb.events.on("thread.created", ({ thread }) => {
    publish(thread.id);
    if (thread.parentThreadId) publish(thread.parentThreadId);
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
    bb.log.info("disposed");
  });
}
