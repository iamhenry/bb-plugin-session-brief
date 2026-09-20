# Dependency map

## Callers and consumers

- `server.ts:108-117` calls `composeBrief` once per `getBrief` RPC and catches composition failures at the RPC boundary, returning sample data rather than exposing an exception.
- `server/composeBrief.ts:357-405` calls `usageForModel` once while composing a brief, then emits the returned `ProviderUsage` as `providers: [usage]`. The provider ID is fixed to `ollama` at `composeBrief.ts:351-354`.
- `components/session-brief/SessionBriefCard.tsx:257-266` passes the provider list into `UsageSection`; the compact strip path does the same at `SessionBriefCard.tsx:81-100`.
- `UsageSection.tsx:76-97` selects the first provider as primary, derives the headline from its windows/message, hides only `not_installed` providers, and renders every supplied window. It does not fetch, transform, or persist usage.

## Callees and producers

- Current Ollama call: `server/usageOllama.ts:29-35` calls the local daemon with a POST body; it does not call `ollama.com`, OpenCode auth, or BB host file APIs.
- Current Ollama result: `server/usageOllama.ts:37-64` always produces an `ok` result with an empty window list and either a cloud/no-daemon message or a stale no-API message.
- Auth infrastructure available for reuse: `server/authFiles.ts:28-75` resolves a host home, chooses Pi/OpenCode auth paths, reads through `bb.sdk.files.read`, decodes base64 when necessary, parses JSON, and suppresses read/parse errors. It never logs file contents.
- Public result boundary: `contract.ts:31-44` validates the provider result. `windows[].usedPercent` must be a finite value between 0 and 100; arbitrary upstream data cannot pass through unchecked.

## Invocation cardinality and ordering

- `composeBrief` gathers independent thread/project data with `Promise.all` at `composeBrief.ts:366-377`, then performs one provider usage call at `composeBrief.ts:389-393`.
- The current Ollama request is one sequential fetch per brief composition. There is no cache or in-flight deduplication on this path.
- The prerequisite check confirmed the OpenCode source entry is `ollama-cloud` with type `api`. The existing helper reads the distinct Pi/OpenCode candidates sequentially (`authFiles.ts:68-75`). A new Ollama key lookup should stop at the first valid candidate and must not read or expose unrelated credential fields.
- The existing usage cache stores only successful non-empty windows (`usageCache.ts:14-21`), so missing/invalid credentials should remain unauthenticated rather than becoming fabricated cached usage.

## Public versus internal surface

- Public RPC surface: `getBrief` returns `sessionBriefSchema` through `server.ts:16-21`; `ProviderUsage` is nested data, not a provider-specific RPC.
- Internal surfaces: `ollamaUsage`, the auth-file helpers, parser functions, cache helpers, `usageForModel`, and `UsageSection` are internal modules.
- A compatible fix should keep `ProviderUsage` unchanged and avoid adding a new RPC, UI prop, or provider-specific schema.

## Blast radius

Likely touched by an implementation:

- `server/usageOllama.ts`: endpoint, credential selection, response parsing, status mapping, and cache/backoff behavior.
- `server/composeBrief.ts`: pass existing `bb` and `hostId` into the Ollama adapter if host auth is reused.
- `server/authFiles.ts`: add a narrowly named API-key selector for the confirmed `ollama-cloud` API entry.
- New or adjacent parser/auth tests under `server/*.test.ts`.

Must remain untouched for the requested boundary:

- `components/session-brief/sections/UsageSection.tsx`, `SessionBriefCard.tsx`, and all display styling.
- `contract.ts`, unless the verified upstream response requires no existing field can represent the two windows; current evidence says it can.
- Token refresh, persistence, browser cookies, and other providers.

## Breaking-change risks

- Changing Ollama from `status: "ok"`/message to `status: "unauthenticated"` changes the semantic state but is required for the edge contract and is already supported by the schema and UI.
- Returning an upstream fraction without multiplying and clamping would fail the schema or display fabricated/out-of-range data; parser tests must guard this.
- Reading an OAuth `access` field instead of an API `key` would silently miss the stated OpenCode credential shape. The chosen source and field name must be explicit.
- The issue authorizes no display-component changes. The data path must feed the existing usage-row treatment rather than add literal meter components.
