import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { projectBriefSchema, sessionBriefSchema } from "./contract";
import { SAMPLE_BRIEF } from "./fixtures/session-brief";
import {
  gitHostContract,
  gitMutationSchema,
  gitPathSchema,
} from "./host-contract";
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
      path: gitPathSchema,
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
  mutateGit: {
    input: z.object({ environmentId: z.string() }).and(gitMutationSchema),
    output: z.null(),
  },
});

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");
  const gitHost = bb.hosts.experimental_client({ contract: gitHostContract });

  const environmentContext = async (environmentId: string) => {
    const environment = await bb.sdk.environments.get({ environmentId });
    if (!environment.isGitRepo || !environment.path) {
      throw new Error("Git workspace unavailable");
    }
    return {
      hostId: environment.hostId,
      workspacePath: environment.path,
    };
  };

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
      const project = await composeProject(bb, threadId);
      if (!project.environmentId || !project.git) return project;
      try {
        const context = await environmentContext(project.environmentId);
        const files = await gitHost.call(
          "status",
          { workspacePath: context.workspacePath },
          { hostId: context.hostId },
        );
        const stats = new Map(project.dirtyFiles.map((file) => [file.path, file]));
        return {
          ...project,
          gitActions: true,
          dirtyFiles: files.map((file) => ({
            path: file.path,
            status: file.status,
            staged: file.staged,
            insertions: stats.get(file.path)?.insertions ?? null,
            deletions: stats.get(file.path)?.deletions ?? null,
          })),
        };
      } catch (error) {
        bb.log.warn(
          `Git actions unavailable: ${error instanceof Error ? error.message : "unknown"}`,
        );
        return project;
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
    mutateGit: async ({ environmentId, ...mutation }) => {
      const context = await environmentContext(environmentId);
      await gitHost.call(
        "mutate",
        { workspacePath: context.workspacePath, ...mutation },
        { hostId: context.hostId },
      );
      publishProject({ environmentId });
      return null;
    },
  });

  bb.onDispose(() => {
    unsubscribeEnvironment();
    unsubscribeThread();
    bb.log.info("disposed");
  });
}
