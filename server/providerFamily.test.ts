import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billingVendorFromModel,
  usageLimitsKey,
} from "./providerFamily.ts";

describe("billingVendorFromModel", () => {
  it("maps model ids not harness ids", () => {
    assert.equal(billingVendorFromModel("claude-sonnet-4"), "claude");
    assert.equal(billingVendorFromModel("gpt-5.6-codex"), "codex");
    assert.equal(billingVendorFromModel("gpt-4o"), "openai");
    assert.equal(billingVendorFromModel("grok-build"), "grok");
    assert.equal(billingVendorFromModel("xai/grok-4.5"), "grok");
    assert.equal(billingVendorFromModel("grok-4.3"), "grok");
    assert.equal(billingVendorFromModel("llama3.1"), "ollama");
    assert.equal(billingVendorFromModel("composer-1"), "cursor");
    assert.equal(billingVendorFromModel("pi"), null);
    assert.equal(billingVendorFromModel(""), null);
  });

  it("maps vendors to BB usageLimits keys", () => {
    assert.equal(usageLimitsKey("codex"), "codex");
    assert.equal(usageLimitsKey("claude"), "claudeCode");
    assert.equal(usageLimitsKey("cursor"), "cursor");
  });
});
