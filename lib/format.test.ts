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
  const now = 1_000_000_000;
  it("formats seconds through days with lower units", () => {
    assert.equal(formatElapsed(now - 12_000, now), "12s");
    assert.equal(formatElapsed(now - 252_000, now), "4m 12s");
    assert.equal(formatElapsed(now - 17_172_000, now), "4h 46m 12s");
    assert.equal(formatElapsed(now - 103_572_000, now), "1d 4h 46m 12s");
  });
  it("keeps zero lower units across rollovers", () => {
    assert.equal(formatElapsed(now - 59_000, now), "59s");
    assert.equal(formatElapsed(now - 60_000, now), "1m 0s");
    assert.equal(formatElapsed(now - 3_600_000, now), "1h 0m 0s");
    assert.equal(formatElapsed(now - 86_400_000, now), "1d 0h 0m 0s");
  });
  it("returns null without a clock", () => {
    assert.equal(formatElapsed(now + 1_000, now), null);
    assert.equal(formatElapsed(Number.NaN, now), null);
  });
});
