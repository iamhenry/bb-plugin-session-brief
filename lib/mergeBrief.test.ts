import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLE_BRIEF } from "../fixtures/session-brief.ts";
import { mergeBrief } from "./mergeBrief.ts";

describe("mergeBrief", () => {
  it("replaces when the thread changes", () => {
    const next = { ...SAMPLE_BRIEF, threadId: "thr_other" };
    assert.equal(mergeBrief(SAMPLE_BRIEF, next), next);
  });

  it("keeps dirty files from getProject across a getBrief stub", () => {
    const previous = {
      ...SAMPLE_BRIEF,
      project: {
        ...SAMPLE_BRIEF.project,
        insertions: 4,
        deletions: 1,
        dirtyFiles: [
          { path: "a.ts", status: "M", insertions: 4, deletions: 1 },
        ],
      },
    };
    const next = {
      ...SAMPLE_BRIEF,
      context: { usedTokens: 99, modelContextWindow: 200_000, estimated: false },
      project: {
        ...SAMPLE_BRIEF.project,
        name: "macvm",
        branch: "feat",
        insertions: 0,
        deletions: 0,
        dirtyFiles: [],
      },
    };
    const merged = mergeBrief(previous, next);
    assert.equal(merged.context.usedTokens, 99);
    assert.equal(merged.project.branch, "feat");
    assert.equal(merged.project.insertions, 4);
    assert.equal(merged.project.dirtyFiles[0]?.path, "a.ts");
  });

  it("keeps last good usage windows", () => {
    const next = {
      ...SAMPLE_BRIEF,
      providers: [
        { ...SAMPLE_BRIEF.providers[0]!, windows: [] },
      ],
    };
    assert.equal(mergeBrief(SAMPLE_BRIEF, next).providers[0]?.windows.length, 1);
  });
});
