import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatElapsed, remainingPercent } from "./format.ts";

describe("remainingPercent", () => {
  it("is 100 minus used, clamped",
    () => {
      assert.equal(remainingPercent(42), 58);
      assert.equal(remainingPercent(0), 100);
      assert.equal(remainingPercent(100), 0);
      assert.equal(remainingPercent(118), 0);
      assert.equal(remainingPercent(-4), 100);
    },
  );
});

describe("formatElapsed", () => {
  const now = 1_000_000;
  it("formats seconds minutes hours", () => {
    assert.equal(formatElapsed(now - 12_000, now), "12s");
    assert.equal(formatElapsed(now - 110_000, now), "1m 50s");
    assert.equal(formatElapsed(now - 3_600_000, now), "1h");
  });
  it("returns null without a clock", () => {
    assert.equal(formatElapsed(now + 1_000, now), null);
    assert.equal(formatElapsed(Number.NaN, now), null);
  });
});
