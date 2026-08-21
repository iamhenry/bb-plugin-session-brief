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
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
