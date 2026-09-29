import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { loadPiOpenCodeAuth, pickNamedOauthAccess } from "./authFiles.ts";

it("uses the live OpenCode v2 credential when auth.json tokens are expired", async () => {
  const data = mkdtempSync(join(tmpdir(), "oc-auth-"));
  mkdirSync(join(data, "opencode"));
  const value = JSON.stringify({ type: "oauth", access: "fresh", expires: Date.now() + 3_600_000 });
  execFileSync("sqlite3", [
    join(data, "opencode", "opencode.db"),
    `create table credential (integration_id text, value text, active integer);
     insert into credential values ('anthropic', '${value}', 1);`,
  ]);
  const previous = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = data;
  const expiredFile = JSON.stringify({ anthropic: { type: "oauth", access: "stale", expires: 1 } });
  const bb = {
    sdk: {
      hosts: { directory: async () => ({ directory: "/home/test" }) },
      files: { read: async () => ({ content: expiredFile, contentEncoding: "utf8" }) },
    },
  } as unknown as BbPluginApi;
  try {
    const bags = await loadPiOpenCodeAuth(bb, "host");
    assert.equal(pickNamedOauthAccess(bags, ["anthropic"])?.token, "fresh");
  } finally {
    if (previous === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previous;
  }
});
