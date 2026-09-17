import type { SessionBrief } from "../contract";

const now = 1_700_000_000_000;

/** Error-path fallback only. Happy path is live `getBrief`. */
export const SAMPLE_BRIEF: SessionBrief = {
  threadId: "thr_fixture",
  providerId: "pi",
  model: "gpt-5.6-codex",
  context: {
    usedTokens: 24_600,
    modelContextWindow: 200_000,
    estimated: false,
  },
  project: { name: "macvm", branch: "main", ahead: 0, behind: 0, git: true, environmentId: null, gitActions: false, insertions: 0, deletions: 0, dirtyFiles: [] },
  providers: [
    {
      id: "codex",
      name: "Codex",
      status: "ok",
      planLabel: "Pro",
      message: null,
      windows: [{ label: "5 hours", usedPercent: 12.3, resetsAt: null }],
    },
  ],
  children: [
    {
      id: "thr_child_1",
      title: "Untitled thread",
      status: "done",
      providerId: "pi",
      colorSlot: 1,
      startedAtMs: now - 600_000,
    },
    {
      id: "thr_child_2",
      title: "Untitled thread",
      status: "running",
      providerId: "pi",
      colorSlot: 2,
      startedAtMs: now - 110_000,
    },
  ],
  tasks: null,
  todos: [],
};
