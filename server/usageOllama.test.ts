import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { pickNamedApiKey } from "./authFiles.ts";
import { ollamaUsage } from "./usageOllama.ts";
import { parseOllamaUsage } from "./usageOllamaParse.ts";

function authBb(auth: unknown): BbPluginApi {
  return {
    sdk: {
      hosts: {
        directory: async () => ({ directory: "/home/test" }),
      },
      files: {
        read: async () => ({
          content: JSON.stringify(auth),
          contentEncoding: "utf8",
        }),
      },
    },
  } as unknown as BbPluginApi;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withFetch(
  fetchImpl: typeof fetch,
  run: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

describe("parseOllamaUsage", () => {
  it("maps weekly and session fractions and clamps percentages", () => {
    assert.deepEqual(
      parseOllamaUsage({
        limits: {
          weekly: { usage: -0.5 },
          session: { usage: 1.5 },
        },
      }),
      [
        { label: "Weekly", usedPercent: 0, resetsAt: null },
        { label: "Session", usedPercent: 100, resetsAt: null },
      ],
    );
    assert.deepEqual(
      parseOllamaUsage({
        limits: {
          weekly: { usage: 0 },
          session: { usage: 1, reset_at: "2026-09-20T00:00:00Z" },
        },
      }),
      [
        { label: "Weekly", usedPercent: 0, resetsAt: null },
        {
          label: "Session",
          usedPercent: 100,
          resetsAt: "2026-09-20T00:00:00Z",
        },
      ],
    );
  });

  it("does not invent windows for malformed limits", () => {
    for (const body of [
      null,
      {},
      { limits: [] },
      { limits: { weekly: { usage: "0.5" }, session: { usage: null } } },
    ]) {
      assert.deepEqual(parseOllamaUsage(body), []);
    }
  });
});

describe("pickNamedApiKey", () => {
  it("selects only a named API key and exposes no auth metadata", () => {
    const picked = pickNamedApiKey(
      [
        {
          "ollama-cloud": {
            type: "oauth",
            key: "wrong-type",
            refresh: "must-not-be-used",
            email: "hidden@example.com",
          },
        },
        {
          other: { type: "api", key: "wrong-provider" },
          "ollama-cloud": {
            type: "api",
            key: "test-key",
            refresh: "must-not-be-used",
            email: "hidden@example.com",
          },
        },
      ],
      ["ollama-cloud"],
    );
    assert.equal(picked, "test-key");
    assert.equal(typeof picked, "string");
  });
});

describe("ollamaUsage", () => {
  it("requests hosted usage and returns only validated windows", async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    await withFetch(
      (async (input, init) => {
        requests.push({ url: String(input), init });
        return jsonResponse({
          limits: {
            weekly: { usage: 0.25 },
            session: { usage: 0.75 },
          },
        });
      }) as typeof fetch,
      async () => {
        const usage = await ollamaUsage({
          bb: authBb({
            "ollama-cloud": {
              type: "api",
              key: "test-key",
              email: "hidden@example.com",
              refresh: "must-not-be-used",
            },
          }),
          hostId: "host-test",
          providerId: "ollama-request",
          contextPercent: null,
        });
        const headers = new Headers(requests[0]?.init?.headers);
        assert.equal(requests[0]?.url, "https://ollama.com/api/usage");
        assert.equal(requests[0]?.init?.method, "GET");
        assert.equal(headers.get("accept"), "application/json");
        assert.equal(headers.get("authorization"), "Bearer test-key");
        assert.deepEqual(usage.windows, [
          { label: "Weekly", usedPercent: 25, resetsAt: null },
          { label: "Session", usedPercent: 75, resetsAt: null },
        ]);
        assert.equal("email" in usage, false);
        assert.equal("refresh" in usage, false);
      },
    );
  });

  it("returns unauthenticated empty usage without a request", async () => {
    let calls = 0;
    await withFetch(
      (async () => {
        calls += 1;
        return jsonResponse({});
      }) as typeof fetch,
      async () => {
        const usage = await ollamaUsage({
          bb: authBb({}),
          hostId: "host-test",
          providerId: "ollama-missing-auth",
          contextPercent: null,
        });
        assert.equal(usage.status, "unauthenticated");
        assert.match(usage.message ?? "", /Sign in to Ollama Cloud/);
        assert.deepEqual(usage.windows, []);
        assert.equal(calls, 0);
      },
    );
  });

  it("maps rejected credentials and unavailable responses safely", async () => {
    for (const [providerId, status] of [
      ["ollama-401", 401],
      ["ollama-403", 403],
    ] as const) {
      await withFetch(
        (async () => jsonResponse({}, status)) as typeof fetch,
        async () => {
          const usage = await ollamaUsage({
            bb: authBb({
              "ollama-cloud": { type: "api", key: "test-key" },
            }),
            hostId: "host-test",
            providerId,
            contextPercent: null,
          });
          assert.equal(usage.status, "unauthenticated");
          assert.deepEqual(usage.windows, []);
        },
      );
    }

    await withFetch(
      (async () => jsonResponse({ invalid: true }, 503)) as typeof fetch,
      async () => {
        const usage = await ollamaUsage({
          bb: authBb({
            "ollama-cloud": { type: "api", key: "test-key" },
          }),
          hostId: "host-test",
          providerId: "ollama-503",
          contextPercent: null,
        });
        assert.equal(usage.status, "ok");
        assert.deepEqual(usage.windows, []);
      },
    );

    await withFetch(
      (async () => new Response("not-json", { status: 200 })) as typeof fetch,
      async () => {
        const usage = await ollamaUsage({
          bb: authBb({
            "ollama-cloud": { type: "api", key: "test-key" },
          }),
          hostId: "host-test",
          providerId: "ollama-malformed",
          contextPercent: null,
        });
        assert.equal(usage.status, "ok");
        assert.deepEqual(usage.windows, []);
      },
    );

    await withFetch(
      (async () => {
        throw new Error("timeout");
      }) as typeof fetch,
      async () => {
        const usage = await ollamaUsage({
          bb: authBb({
            "ollama-cloud": { type: "api", key: "test-key" },
          }),
          hostId: "host-test",
          providerId: "ollama-timeout",
          contextPercent: null,
        });
        assert.equal(usage.status, "ok");
        assert.deepEqual(usage.windows, []);
      },
    );
  });

  it("reuses valid windows and backs off after a transient failure", async () => {
    let cacheCalls = 0;
    await withFetch(
      (async () => {
        cacheCalls += 1;
        return jsonResponse({ limits: { weekly: { usage: 0.2 } } });
      }) as typeof fetch,
      async () => {
        const args = {
          bb: authBb({
            "ollama-cloud": { type: "api", key: "test-key" },
          }),
          hostId: "host-test",
          providerId: "ollama-cache",
          contextPercent: null,
        };
        const first = await ollamaUsage(args);
        const second = await ollamaUsage(args);
        assert.deepEqual(second.windows, first.windows);
        assert.equal(cacheCalls, 1);
      },
    );

    let backoffCalls = 0;
    await withFetch(
      (async () => {
        backoffCalls += 1;
        return jsonResponse({}, 500);
      }) as typeof fetch,
      async () => {
        const args = {
          bb: authBb({
            "ollama-cloud": { type: "api", key: "test-key" },
          }),
          hostId: "host-test",
          providerId: "ollama-backoff",
          contextPercent: null,
        };
        await ollamaUsage(args);
        const second = await ollamaUsage(args);
        assert.deepEqual(second.windows, []);
        assert.equal(backoffCalls, 1);
      },
    );
  });
});
