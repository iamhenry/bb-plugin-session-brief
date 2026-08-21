import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChatgptUsage } from "./usageChatgptParse.ts";
import {
  parseAnthropicUsage,
  utilizationToUsedPercent,
} from "./usageAnthropicParse.ts";

describe("parseChatgptUsage", () => {
  it("reads weekly used_percent without email", () => {
    const parsed = parseChatgptUsage({
      email: "hidden@example.com",
      plan_type: "plus",
      rate_limit: {
        primary_window: {
          used_percent: 21,
          limit_window_seconds: 604800,
          reset_at: 1_700_000_000,
        },
      },
    });
    assert.equal(parsed.planLabel, "plus");
    assert.equal(parsed.usedPercent, 21);
    assert.equal(parsed.windowLabel, "Weekly Limit");
    assert.ok(parsed.resetsAt);
    assert.equal("email" in parsed, false);
  });
});

describe("utilizationToUsedPercent", () => {
  it("treats values over 1 as already-percent", () => {
    assert.equal(utilizationToUsedPercent(7), 7);
    assert.equal(utilizationToUsedPercent(0.07), 7);
    assert.equal(utilizationToUsedPercent(0), 0);
  });
});

describe("parseAnthropicUsage", () => {
  it("prefers limits[].percent matching the Claude dashboard", () => {
    const windows = parseAnthropicUsage({
      five_hour: { utilization: 7, resets_at: "2026-08-21T08:29:59Z" },
      seven_day: { utilization: 0, resets_at: "2026-08-26T13:00:00Z" },
      limits: [
        {
          kind: "session",
          percent: 7,
          resets_at: "2026-08-21T08:29:59Z",
        },
        {
          kind: "weekly_all",
          percent: 0,
          resets_at: "2026-08-26T13:00:00Z",
        },
      ],
    });
    assert.equal(windows[0]?.label, "5h Limit");
    assert.equal(windows[0]?.usedPercent, 7);
    assert.equal(windows[1]?.label, "Weekly Limit");
    assert.equal(windows[1]?.usedPercent, 0);
  });
});
