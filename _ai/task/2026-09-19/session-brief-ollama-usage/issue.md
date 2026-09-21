# Session Brief shows no usage for Ollama Cloud while signed in

Classification: `bug`

## Original GitHub issue

- Source: https://github.com/iamhenry/bb-plugin-session-brief/issues/1
- Reported problem: When a user is signed in and using an Ollama Cloud model, Session Brief Usage shows only "Ollama Cloud has no remaining-% ..." and displays no usage bars or percentages.
- Reproduction supplied by the ticket:
  1. Sign in to Ollama Cloud.
  2. Use an Ollama Cloud model.
  3. Open Session Brief Usage and inspect the usage display.
- User-visible evidence: https://github.com/user-attachments/assets/de05b869-ba2e-4822-87ed-15af9fe281a2
- Reported expected behavior: Signed-in users see Weekly and Session usage through the existing progress bars. Signed-out users or users with invalid credentials see a clear unauthenticated message, with no fabricated values and no crash.
- Intake boundary: Technical hypotheses in the linked issue are not verified facts and are deferred to research.
- Delivery clarification: No UI or display-component changes are authorized. The existing usage-row and percentage treatment is the target, rather than adding literal meter components.

## Acceptance criteria

- A signed-in Ollama Cloud user who uses an Ollama Cloud model sees Weekly and Session usage in the existing usage-row and percentage treatment.
- A signed-out user or a user with invalid Ollama Cloud credentials sees a clear unauthenticated message.
- The signed-out or invalid-credential state shows no fabricated usage values and does not crash.
- UI appearance changes, browser-cookie reading or scraping, token storage or refresh, and support for other providers remain out of scope.

## Gherkin happy path

### Happy path: Signed-in Ollama Cloud usage is displayed

Given the user is signed in to Ollama Cloud and is using an Ollama Cloud model
When the user opens Session Brief Usage
Then the user sees Weekly and Session usage in the existing usage-row and percentage treatment instead of the truncated no-data message

## Gherkin edge path

### Edge path: Unauthenticated Ollama Cloud state is clear and safe

Given the user is signed out of Ollama Cloud or has invalid Ollama Cloud credentials
When the user opens Session Brief Usage
Then the user sees a clear unauthenticated message, no fabricated usage values, and no crash

## Research index

- [Code archaeology](research/code-archaeology.md), current Ollama path, causal explanation, tests, and the resolved UI wording.
- [Dependency map](research/dependency-map.md), callers, callees, invocation order, public/internal boundaries, and blast radius.
- [UX behavior](research/ux-behavior.md), current and post-change user-visible flows.
- [Style fingerprint](research/style-fingerprint.md), maintainer-style implementation and test conventions.
- [External signal](research/external-signal.md), official Ollama auth/API guidance, OpenCode auth schema, and the sanitized authenticated endpoint probe.
- Reproduction receipt: `reproduction/result.md:7-27`; screenshot: `reproduction/screenshots/reporter-issue-1.png`.

## Approaches

### 1. Host-aware OpenCode API-key adapter, minimal supported approach

Extend the existing Ollama server path rather than changing the UI:

1. Pass the existing `bb` and `hostId` from `composeBrief.ts:389-393` into `ollamaUsage`.
2. Reuse `server/authFiles.ts:45-75` for read-only, host-aware Pi/OpenCode auth loading and add a narrowly scoped selector for the `ollama-cloud` API entry’s `key` field. Do not return, log, persist, refresh, or copy the key.
3. Call `GET https://ollama.com/api/usage` with `Accept: application/json`, `Authorization: Bearer <key>`, `redirect: "error"`, and the existing short timeout. Treat 401/403 as unauthenticated; treat missing credentials, malformed JSON, timeouts, and other unavailable responses as safe empty usage with a readable message or existing valid cache.
4. Parse the observed numeric fields `limits.weekly.usage` and `limits.session.usage` into `UsageWindow` values labeled `Weekly` and `Session`. The authenticated response returned numbers in the 0–1 range, so convert them to 0–100 and clamp. The inspected weekly and session objects had no reset field, so use `resetsAt: null` unless a later response supplies a validated reset value. Reuse `usageCache.ts:3-59` for successful-window TTL and transient backoff to avoid repeated upstream calls.
5. Leave `UsageSection.tsx`, `SessionBriefCard.tsx`, styling, the provider contract, other providers, token refresh, and browser-cookie paths unchanged. The existing usage-row treatment is the target; no new meter component is needed.

Why it is ranked first: it reuses the existing host/file/auth patterns, adds no RPC or UI concept, keeps the current provider contract, and directly addresses the causal gap identified in `server/usageOllama.ts:29-64`.

Required regression probes:

- Pure parser probes: `limits.weekly.usage` and `limits.session.usage` map from fractions to percentages; 0 and 1 remain 0 and 100; values below/above the expected range clamp; missing, non-numeric, non-record, and malformed nested values produce no fabricated windows; absent reset fields produce `resetsAt: null`.
- Auth/request probes: an API `key` is selected from an `ollama-cloud` entry without returning it; no OAuth refresh field, email, or unrelated auth field reaches the result; the request uses GET, the hosted URL, and Bearer auth; 401/403 yields `unauthenticated` with empty windows.
- Cache/error probes: valid windows can be reused within the TTL; timeout/5xx does not throw or create values; repeated refreshes during backoff do not create a request storm.
- Existing user smoke: signed-in Ollama Cloud model → open Usage → Weekly and Session values appear in the current rendering; signed-out/invalid credential → readable unauthenticated message, no numbers, no crash.

Support status: one sanitized in-process check found the existing OpenCode auth entry `ollama-cloud` with type `api`, and one authenticated `GET https://ollama.com/api/usage` returned HTTP 200. The response contained `limits.session` and `limits.weekly` objects, each with a numeric `usage` field whose observed range was fraction-like 0–1. No reset fields were present in those objects. The check recorded no private values, made no retry, and did not expose the key. The official docs independently support the hosted origin and Bearer scheme (`research/external-signal.md`).

### 2. Environment-key-only adapter, documented credential source that does not satisfy the reported signed-in path

Read `OLLAMA_API_KEY` from the plugin process and call the same hosted endpoint with the documented Bearer scheme. This avoids auth-file parsing, but it does not reuse the OpenCode sign-in that the issue reports and may not be present in BB’s host environment. It is therefore a fallback only if the maintainer explicitly changes the credential requirement; it should not be selected for the current ticket as written.

Required probes would be the same endpoint/parser/cache/edge probes as Approach 1, plus verification that BB and the model host actually expose `OLLAMA_API_KEY`. No credential should be logged or returned.

## Judge Decision

Status: SELECTED
Selected Approach: Host-aware OpenCode API-key adapter, minimal supported approach
Confidence: Medium

Scores:
- Host-aware OpenCode API-key adapter, minimal supported approach: 93/100 - directly satisfies both user paths with the smallest data-only change and strong local/external evidence.
- Environment-key-only adapter, documented credential source that does not satisfy the reported signed-in path: 35/100 - fails the signed-in OpenCode acceptance path because BB may not expose `OLLAMA_API_KEY`.

Decision:
- Approach 1 is the only candidate that addresses the reported signed-in path: the current adapter never reads cloud auth or calls the hosted endpoint (`research/code-archaeology.md`), while the evidence confirms an `ollama-cloud` API entry and a hosted response containing weekly and session usage fields (`research/external-signal.md`).
- It preserves the existing `ProviderUsage` contract and usage-row rendering; the dependency and UX research confirm that validated windows will be displayed without changing UI components (`research/dependency-map.md`, `research/ux-behavior.md`).
- Its read-only auth lookup, defensive parsing, 401/403 handling, cache/backoff reuse, and no-cookie/no-refresh boundaries align with the acceptance criteria and repository conventions. Missing or rejected credentials must remain an unauthenticated empty-window state, while only validated successful windows may be cached.
- Approach 2 is not a viable fallback for this issue because it depends on a credential source that is not the reported signed-in path.

Question:
N/A

## Synthesis

### Current behavior

The model classification is correct: `billingVendorFromModel` maps Ollama/Llama model IDs to `ollama` (`server/providerFamily.ts:29-38`). The failure occurs after dispatch. `composeBrief.ts:351-354` calls `ollamaUsage` without the BB API or host ID. `usageOllama.ts:29-35` then POSTs only the local daemon’s `/api/me`; every non-OK response, exception, and successful response returns `windows: []` (`usageOllama.ts:37-65`). `UsageSection.tsx:20-31,48-66` consequently displays the fallback message and has no rows to render. This explains the retained `REPRODUCED` result and screenshot without assuming an auth failure.

### Causal explanation versus alternatives

- **Cause supported by local evidence:** the Ollama adapter is hard-coded to a local `/api/me` probe and deliberately emits no usage windows. It has no cloud endpoint, no OpenCode auth lookup, and no parser for Weekly/Session usage.
- **Not the primary cause:** model/vendor classification is supported by `providerFamily.ts:29-38`; the request reaches the Ollama branch.
- **Not a current UI data-consumption bug:** the UI already renders any supplied `ProviderUsage.windows` as labels, reset text, and remaining percentages (`UsageSection.tsx:20-45`). It receives no windows.
- **Cloud endpoint behavior is now supported:** one authenticated, sanitized request returned HTTP 200 with `limits.session.usage` and `limits.weekly.usage` as numeric fraction-like values in the 0–1 range. No reset fields appeared in those period objects.
- **Credential-source behavior is now supported:** the existing OpenCode auth document contains an `ollama-cloud` entry of type `api`; its key was used in-process for the single request and was not printed, returned, logged, copied, or persisted.

### Constraints and style

- Preserve exactly the two existing scenarios and the no-UI-change, no-cookie-scraping, no-storage/refresh, other-provider boundaries above.
- Keep `ProviderUsage` as the single data contract (`contract.ts:31-44`), parse unknown upstream data defensively, clamp values, and never fabricate percentages.
- Follow existing provider/auth/cache patterns described in `research/style-fingerprint.md`.

### Blast radius

The minimal data path likely touches `server/usageOllama.ts`, `server/composeBrief.ts`, optionally `server/authFiles.ts`, and new server-side parser/auth tests. It should not touch `UsageSection.tsx` or display components. Full details are in `research/dependency-map.md`.

### Prerequisite repair result

- Auth entry: `ollama-cloud`, type `api`; no unrelated auth entries or personal data were recorded.
- One authenticated request: HTTP 200 from `GET https://ollama.com/api/usage`; no retries.
- Sanitized response shape: `limits.session` and `limits.weekly` are objects; each `usage` field is numeric and observed as fraction-like 0–1. No reset fields appeared in either object. Exact usage values were discarded.
- UI scope: resolved. No UI or display-component changes are authorized; the current usage-row rendering is the target.

## Research conclusion

Classification remains `bug`. The supported minimal direction is a host-aware, read-only OpenCode API-key adapter plus defensive parsing of the verified weekly and session fields. The environment-only alternative is documented but does not meet the signed-in OpenCode scenario. No approach is selected here; hand off to `judge-proposal` as authorized.
