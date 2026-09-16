import assert from "node:assert/strict";
import { test } from "node:test";
import type { ChildThread } from "../contract";
import { INBOX_RETENTION_MS, filterInbox } from "./inbox.ts";

const NOW = 1_700_000_000_000;

function child(overrides: Partial<ChildThread>): ChildThread {
  return {
    id: "thr_x",
    title: "T",
    status: "done",
    providerId: "pi",
    colorSlot: 1,
    startedAtMs: NOW,
    lastActivityMs: NOW,
    pinned: false,
    ...overrides,
  };
}

test("keeps pinned regardless of age", () => {
  const row = child({ pinned: true, lastActivityMs: NOW - 10 * INBOX_RETENTION_MS });
  assert.deepEqual(filterInbox([row], NOW), [row]);
});

test("keeps threads needing attention regardless of age", () => {
  for (const status of ["running", "needs_input", "error"] as const) {
    const row = child({ status, lastActivityMs: NOW - 10 * INBOX_RETENTION_MS });
    assert.deepEqual(filterInbox([row], NOW), [row]);
  }
});

test("keeps threads active within the window, drops older idle ones", () => {
  const fresh = child({ id: "a", lastActivityMs: NOW - INBOX_RETENTION_MS + 1 });
  const boundary = child({ id: "b", lastActivityMs: NOW - INBOX_RETENTION_MS });
  const older = child({ id: "c", lastActivityMs: NOW - INBOX_RETENTION_MS - 1 });
  assert.deepEqual(filterInbox([fresh, boundary, older], NOW), [fresh, boundary]);
});

test("keeps rows with unknown activity time", () => {
  const row = child({ lastActivityMs: null });
  assert.deepEqual(filterInbox([row], NOW), [row]);
});

test("preserves input order", () => {
  const first = child({ id: "a" });
  const second = child({ id: "b", lastActivityMs: NOW - 60_000 });
  const third = child({ id: "c", lastActivityMs: NOW - 120_000 });
  assert.deepEqual(filterInbox([first, second, third], NOW), [
    first,
    second,
    third,
  ]);
});

test("retention constant is 48 hours", () => {
  assert.equal(INBOX_RETENTION_MS, 48 * 60 * 60 * 1000);
});