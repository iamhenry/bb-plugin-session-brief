import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProjectEnvironmentChange,
  isProjectThreadChange,
} from "./projectSignals.ts";

describe("isProjectEnvironmentChange", () => {
  it("matches working-tree and ref updates", () => {
    assert.equal(isProjectEnvironmentChange(["work-status-changed"]), true);
    assert.equal(isProjectEnvironmentChange(["git-refs-changed"]), true);
    assert.equal(isProjectEnvironmentChange(["status-changed"]), true);
  });

  it("ignores metadata-only noise", () => {
    assert.equal(isProjectEnvironmentChange(["metadata-changed"]), false);
    assert.equal(isProjectEnvironmentChange(["thread-storage-changed"]), false);
    assert.equal(isProjectEnvironmentChange(undefined), false);
  });
});

describe("isProjectThreadChange", () => {
  it("matches file and diff events", () => {
    assert.equal(
      isProjectThreadChange({
        changes: ["events-appended"],
        eventTypes: ["item/fileChange/outputDelta"],
      }),
      true,
    );
    assert.equal(
      isProjectThreadChange({
        changes: ["events-appended"],
        eventTypes: ["turn/diff/updated"],
      }),
      true,
    );
  });

  it("matches a thread environment switch", () => {
    assert.equal(
      isProjectThreadChange({ changes: ["environment-changed"] }),
      true,
    );
  });

  it("ignores token and title chatter", () => {
    assert.equal(
      isProjectThreadChange({
        changes: ["events-appended"],
        eventTypes: ["item/agentMessage/delta"],
      }),
      false,
    );
    assert.equal(isProjectThreadChange({ changes: ["title-changed"] }), false);
  });
});
