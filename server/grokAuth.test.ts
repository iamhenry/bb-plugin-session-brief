import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractGrokBearer,
  parseGrokBillingBody,
  parseGrokSubscriptionBody,
  parseGrokUserTier,
  pickGrokAuth,
} from "./grokAuth.ts";

describe("extractGrokBearer", () => {
  it("prefers auth.x.ai and does not expose extra fields", () => {
    const picked = extractGrokBearer({
      "https://accounts.x.ai/sign-in": { key: "legacy-token", auth_mode: "old" },
      "https://auth.x.ai::grok": {
        key: "current-token",
        auth_mode: "SuperGrok",
        email: "hidden@example.com",
        refresh_token: "must-not-leak",
      },
    });
    assert.ok(picked);
    assert.equal(picked.token, "current-token");
    assert.equal(picked.meta.planHint, "SuperGrok");
    assert.equal("refresh_token" in picked.meta, false);
    assert.equal("email" in picked.meta, false);
  });

  it("marks expired entries", () => {
    const picked = extractGrokBearer(
      {
        "https://auth.x.ai": {
          key: "stale",
          expires_at: "2020-01-01T00:00:00.000Z",
        },
      },
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
    assert.equal(picked?.meta.expired, true);
  });
});

describe("pickGrokAuth", () => {
  it("reads Pi/OpenCode xai oauth access and ignores refresh", () => {
    const picked = pickGrokAuth(
      {
        xai: {
          type: "oauth",
          access: "pi-access",
          refresh: "must-not-leak",
          expires: Date.parse("2026-08-22T00:00:00.000Z"),
        },
      },
      Date.parse("2026-08-21T00:00:00.000Z"),
    );
    assert.ok(picked);
    assert.equal(picked.token, "pi-access");
    assert.equal(picked.meta.expired, false);
    assert.equal("refresh" in picked.meta, false);
    assert.equal("refresh_token" in picked, false);
  });

  it("skips xai api_key bags", () => {
    const picked = pickGrokAuth({
      xai: { type: "api_key", key: "xai-api-key" },
    });
    assert.equal(picked, null);
  });

  it("marks Pi oauth expired from expires ms", () => {
    const picked = pickGrokAuth(
      {
        xai: {
          type: "oauth",
          access: "stale",
          expires: Date.parse("2020-01-01T00:00:00.000Z"),
        },
      },
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
    assert.equal(picked?.meta.expired, true);
  });
});

describe("parseGrokBillingBody", () => {
  it("reads creditUsagePercent and weekly reset", () => {
    const parsed = parseGrokBillingBody({
      config: {
        creditUsagePercent: 42.5,
        currentPeriod: {
          type: "USAGE_PERIOD_TYPE_WEEKLY",
          end: "2026-08-26T21:55:00.000Z",
        },
        productUsage: [{ product: "GrokBuild", usagePercent: 61.2 }],
      },
    });
    assert.equal(parsed.usedPercent, 42.5);
    assert.equal(parsed.resetsAt, "2026-08-26T21:55:00.000Z");
    assert.equal(parsed.windowLabel, "Weekly Limit");
  });

  it("falls back to GrokBuild product percent", () => {
    const parsed = parseGrokBillingBody({
      config: {
        productUsage: [{ product: "GrokBuild", usagePercent: 12 }],
      },
    });
    assert.equal(parsed.usedPercent, 12);
  });

  it("does not invent a percent", () => {
    const parsed = parseGrokBillingBody({ config: {} });
    assert.equal(parsed.usedPercent, null);
  });
});

describe("parseGrokUserTier", () => {
  it("maps subscriptionTier without other identity fields", () => {
    const label = parseGrokUserTier({
      subscriptionTier: "GrokPro",
      email: "hidden@example.com",
    });
    assert.equal(label, "SuperGrok");
  });
});

describe("parseGrokSubscriptionBody", () => {
  it("reads weekly percent when present", () => {
    const parsed = parseGrokSubscriptionBody({
      plan: "Pro",
      usagePercent: 21,
      currentPeriod: { end: "2026-08-26T21:55:00.000Z" },
    });
    assert.equal(parsed.planLabel, "Pro");
    assert.equal(parsed.usedPercent, 21);
    assert.equal(parsed.resetsAt, "2026-08-26T21:55:00.000Z");
  });

  it("does not invent a percent", () => {
    const parsed = parseGrokSubscriptionBody({ plan: "Pro" });
    assert.equal(parsed.usedPercent, null);
    assert.equal(parsed.planLabel, "Pro");
  });
});
