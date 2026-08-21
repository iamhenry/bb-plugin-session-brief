import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type {
  ChildThread,
  ContextUsage,
  ProviderUsage,
  ProjectBrief,
  SessionBrief,
  TodoItem,
} from "../contract";
import { colorSlotFromId } from "../lib/format";
import {
  billingVendorFromModel,
  noSubscriptionUsage,
  vendorDisplayName,
} from "./providerFamily";
import { anthropicUsage } from "./usageAnthropic";
import { chatgptUsage } from "./usageChatgpt";
import { grokUsage } from "./usageGrok";
import { nativeUsage } from "./usageNative";
import { ollamaUsage } from "./usageOllama";

type ListedThread = {
  id: string;
  title: string | null;
  titleFallback: string | null;
  providerId: string;
  status: string;
  hasPendingInteraction: boolean;
  createdAt: number;
  runtime?: { displayStatus?: string };
  activity?: {
    activeBackgroundAgentCount: number;
    activeBackgroundCommandCount: number;
    activeGoalCount: number;
    activePlanModeCount: number;
    activeWorkflowCount: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function listedThreads(value: unknown): ListedThread[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.threads)
      ? value.threads
      : [];
  return rows.filter((row): row is ListedThread => {
    return isRecord(row) && typeof row.id === "string";
  }) as ListedThread[];
}

function mapChild(row: ListedThread): ChildThread {
  const display = row.runtime?.displayStatus;
  const failed = row.status === "error" || display === "error";
  const busy =
    row.status === "active" ||
    row.status === "starting" ||
    ((row.activity?.activeBackgroundAgentCount ?? 0) +
      (row.activity?.activeBackgroundCommandCount ?? 0) +
      (row.activity?.activeWorkflowCount ?? 0) +
      (row.activity?.activePlanModeCount ?? 0) +
      (row.activity?.activeGoalCount ?? 0) >
      0);

  let status: ChildThread["status"] = "done";
  if (row.hasPendingInteraction) status = "needs_input";
  else if (failed) status = "error";
  else if (busy) status = "running";

  return {
    id: row.id,
    title: row.title ?? row.titleFallback ?? "Untitled thread",
    status,
    providerId: row.providerId,
    colorSlot: colorSlotFromId(row.id),
    startedAtMs: typeof row.createdAt === "number" ? row.createdAt : null,
  };
}

function contextFromTimeline(timeline: unknown): ContextUsage {
  if (!isRecord(timeline)) {
    return { usedTokens: 0, modelContextWindow: 0, estimated: true };
  }
  const usage = timeline.contextWindowUsage;
  if (!isRecord(usage)) {
    return { usedTokens: 0, modelContextWindow: 0, estimated: true };
  }
  const usedTokens =
    typeof usage.usedTokens === "number" ? usage.usedTokens : 0;
  const modelContextWindow =
    typeof usage.modelContextWindow === "number"
      ? usage.modelContextWindow
      : 0;
  return {
    usedTokens,
    modelContextWindow,
    estimated: usage.estimated === true,
  };
}

function todosFromTimeline(timeline: unknown): TodoItem[] {
  if (!isRecord(timeline) || !isRecord(timeline.pendingTodos)) return [];
  const items = timeline.pendingTodos.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string") return [];
    const status =
      item.status === "completed" ||
      item.status === "in_progress" ||
      item.status === "pending"
        ? item.status
        : "pending";
    return [
      {
        id: item.id,
        text: typeof item.text === "string" ? item.text : "",
        status,
      },
    ];
  });
}


const TRACKED_STATUS = new Set(["A", "C", "D", "M", "R", "U"]);
const MAX_DIRTY_FILES = 25;

function environmentIdFrom(thread: unknown): string | null {
  if (!isRecord(thread)) return null;
  if (typeof thread.environmentId === "string") return thread.environmentId;
  if (isRecord(thread.environment) && typeof thread.environment.id === "string") {
    return thread.environment.id;
  }
  return null;
}

function dirtyFromStatus(status: unknown): {
  insertions: number;
  deletions: number;
  dirtyFiles: {
    path: string;
    status: string;
    insertions: number | null;
    deletions: number | null;
  }[];
} {
  if (!isRecord(status) || status.outcome !== "available" || !isRecord(status.workspace)) {
    return { insertions: 0, deletions: 0, dirtyFiles: [] };
  }
  const tree = status.workspace.workingTree;
  if (!isRecord(tree) || !Array.isArray(tree.files)) {
    return { insertions: 0, deletions: 0, dirtyFiles: [] };
  }
  const dirtyFiles = tree.files.flatMap((file) => {
    if (!isRecord(file) || typeof file.path !== "string") return [];
    const letter = typeof file.status === "string" ? file.status : "";
    if (!TRACKED_STATUS.has(letter)) return [];
    return [{
      path: file.path,
      status: letter,
      insertions: typeof file.insertions === "number" ? Math.max(0, file.insertions) : null,
      deletions: typeof file.deletions === "number" ? Math.max(0, file.deletions) : null,
    }];
  }).slice(0, MAX_DIRTY_FILES);
  return {
    insertions: typeof tree.insertions === "number" ? Math.max(0, tree.insertions) : 0,
    deletions: typeof tree.deletions === "number" ? Math.max(0, tree.deletions) : 0,
    dirtyFiles,
  };
}

function projectFrom(
  thread: unknown,
  project: unknown,
  gitStatus: unknown,
): ProjectBrief {
  const env = isRecord(thread) && isRecord(thread.environment)
    ? thread.environment
    : null;
  const git = env?.isGitRepo === true;
  const branch =
    env && typeof env.branchName === "string" && env.branchName.length > 0
      ? env.branchName
      : null;
  const name =
    isRecord(project) && typeof project.name === "string" && project.name.length > 0
      ? project.name
      : "Untitled project";
  const dirty = git ? dirtyFromStatus(gitStatus) : { insertions: 0, deletions: 0, dirtyFiles: [] };
  return {
    name,
    branch,
    git,
    environmentId: environmentIdFrom(thread),
    insertions: dirty.insertions,
    deletions: dirty.deletions,
    dirtyFiles: dirty.dirtyFiles,
  };
}

function hostIdFromThread(thread: unknown): string | undefined {
  if (!isRecord(thread)) return undefined;
  if (isRecord(thread.host) && typeof thread.host.id === "string") {
    return thread.host.id;
  }
  if (
    isRecord(thread.environment) &&
    typeof thread.environment.hostId === "string"
  ) {
    return thread.environment.hostId;
  }
  return undefined;
}

async function usageForModel(args: {
  bb: BbPluginApi;
  model: string;
  hostId: string | undefined;
}): Promise<ProviderUsage> {
  const vendor = billingVendorFromModel(args.model);
  if (!vendor) return noSubscriptionUsage(args.model);

  if (vendor === "claude") {
    const oauth = await anthropicUsage({ bb: args.bb, hostId: args.hostId });
    if (oauth.status === "ok" || oauth.windows.length > 0) return oauth;
    try {
      const native = await nativeUsage({
        bb: args.bb,
        hostId: args.hostId,
        providerId: "claude",
        family: "claude",
      });
      if (native.status === "ok" && native.windows.length > 0) return native;
    } catch {
      // Keep Pi/OpenCode oauth copy rather than Claude Code CLI sign-in.
    }
    return oauth;
  }

  if (vendor === "openai" || vendor === "codex") {
    const oauth = await chatgptUsage({
      bb: args.bb,
      hostId: args.hostId,
      id: vendor,
      displayName: vendorDisplayName(vendor),
    });
    if (oauth.status === "ok" || oauth.windows.length > 0) return oauth;
    try {
      const native = await nativeUsage({
        bb: args.bb,
        hostId: args.hostId,
        providerId: vendor,
        family: "codex",
      });
      if (native.status === "ok" && native.windows.length > 0) return native;
    } catch {
      // Keep ChatGPT/Pi oauth copy rather than Codex CLI sign-in.
    }
    return oauth;
  }

  if (vendor === "cursor") {
    try {
      return await nativeUsage({
        bb: args.bb,
        hostId: args.hostId,
        providerId: "cursor",
        family: "cursor",
      });
    } catch {
      return {
        id: vendor,
        name: vendorDisplayName(vendor),
        status: "error",
        planLabel: null,
        message: "Usage limits unavailable.",
        windows: [],
      };
    }
  }

  if (vendor === "grok") {
    return grokUsage({
      bb: args.bb,
      hostId: args.hostId,
      providerId: "grok",
      contextPercent: null,
    });
  }

  return ollamaUsage({
    providerId: "ollama",
    contextPercent: null,
  });
}

export async function composeBrief(
  bb: BbPluginApi,
  threadId: string,
): Promise<SessionBrief> {
  const thread = await bb.sdk.threads
    .get({
      threadId,
      include: "environment,host",
    })
    .catch(() => bb.sdk.threads.get({ threadId }));
  const projectId =
    isRecord(thread) && typeof thread.projectId === "string"
      ? thread.projectId
      : null;
  const environmentId = environmentIdFrom(thread);
  const [listed, timeline, options, project, gitStatus] = await Promise.all([
    bb.sdk.threads.list({ parentThreadId: threadId, limit: 50 }),
    bb.sdk.threads.timeline({ threadId, summaryOnly: "true" }),
    bb.sdk.threads.defaultExecutionOptions({ threadId }).catch(() => null),
    projectId
      ? bb.sdk.projects.get({ projectId }).catch(() => null)
      : Promise.resolve(null),
    environmentId
      ? bb.sdk.environments.status({ environmentId }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const context = contextFromTimeline(timeline);
  const providerId =
    typeof thread.providerId === "string" ? thread.providerId : "unknown";
  const model =
    options && isRecord(options) && typeof options.model === "string"
      ? options.model
      : "";

  const usage = await usageForModel({
    bb,
    model,
    hostId: hostIdFromThread(thread),
  });

  return {
    threadId,
    providerId,
    model,
    context,
    project: projectFrom(thread, project, gitStatus),
    providers: [usage],
    children: listedThreads(listed).map(mapChild),
    todos: todosFromTimeline(timeline),
  };
}
