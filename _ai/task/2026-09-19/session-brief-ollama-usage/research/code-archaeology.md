# Code archaeology

## Target scenarios

### Happy path: Signed-in Ollama Cloud usage is displayed

Given the user is signed in to Ollama Cloud and is using an Ollama Cloud model
When the user opens Session Brief Usage
Then the user sees Weekly and Session usage in the existing usage-row and percentage treatment instead of the truncated no-data message

### Edge path: Unauthenticated Ollama Cloud state is clear and safe

Given the user is signed out of Ollama Cloud or has invalid Ollama Cloud credentials
When the user opens Session Brief Usage
Then the user sees a clear unauthenticated message, no fabricated usage values, and no crash

## Entry point and current path

1. `server.ts:108-117` registers `getBrief`; it delegates to `composeBrief` and falls back to sample data only if composition throws.
2. `server/composeBrief.ts:275-355` derives the billing vendor from the current model, dispatches provider usage, and includes the result as the only item in `SessionBrief.providers` at lines 389-402.
3. `server/providerFamily.ts:29-38` maps model strings containing `ollama` or `llama` to the `ollama` vendor. The reported model classification is therefore not the failing branch.
4. For that vendor, `composeBrief.ts:351-354` calls `ollamaUsage` with only `providerId` and `contextPercent`; it does not pass the BB API or host ID needed to read a host-side auth file.
5. `server/usageOllama.ts:3-6` targets only `POST http://127.0.0.1:11434/api/me` and defines the cloud/no-daemon message.
6. `server/usageOllama.ts:29-45` maps every non-OK local response to `status: "ok"`, `windows: []`, and `CLOUD_MESSAGE`. `server/usageOllama.ts:47-55` also returns `windows: []` after a successful local response; it only attempts to extract a plan label.
7. `server/usageOllama.ts:56-65` maps network, timeout, and JSON errors to the same `status: "ok"` zero-window result.

## Why the screenshot follows from the code

`components/session-brief/sections/UsageSection.tsx:20-31` uses a provider message as the headline whenever `windows` is empty. `UsageSection.tsx:56-66` renders window rows only when windows exist. Therefore the Ollama result above necessarily produces the observed message and no usage values. The retained reproduction confirms that exact state at `reproduction/result.md:7-27` and `reproduction/screenshots/reporter-issue-1.png`.

## Relevant contracts and adjacent implementations

- `contract.ts:19-44` already accepts a list of labeled usage windows with a clamped `usedPercent` range, optional reset timestamps, status, and message. No contract extension is required for Weekly and Session rows.
- `server/usageAnthropicParse.ts:3-59` is the closest parser pattern: accept `unknown`, validate nested records and numeric values, clamp percentages, and preserve reset timestamps only when they are strings.
- `server/usageChatgpt.ts:15-35` and `server/usageAnthropic.ts:16-35` use bounded GET requests, parse JSON defensively, and map 401/403 to unauthenticated states.
- `server/authFiles.ts:45-75` already reads Pi and OpenCode JSON read-only through the BB host file API without logging contents. `pickNamedOauthAccess` at `authFiles.ts:88-113` handles OAuth `access`; an Ollama API credential would require a separate API-key extraction path because OpenCode API auth uses a `key` field rather than `access`.
- `server/usageCache.ts:3-59` provides the existing ten-minute successful-window TTL and one-minute backoff primitives. The current Ollama adapter does not use them.

## Tests and nearby gaps

- `package.json:27-30` runs TypeScript checking and Node tests under `server/*.test.ts` and `lib/*.test.ts`.
- `server/usageChatgpt.test.ts:9-61` demonstrates pure parser tests for numeric conversion, malformed input, reset mapping, and privacy boundaries.
- `server/grokAuth.test.ts:43-143` demonstrates auth extraction tests that assert refresh/identity fields are not returned.
- There is no `server/usageOllama.test.ts`, no Ollama parser module, and no current test for the Ollama path.

## Causal conclusion

The reproduced bug comes from the stale "Ollama has no remaining-% API" implementation, not from the provider classifier or from the UsageSection failing to consume valid windows. The current path never attempts a cloud usage request and never reads the OpenCode credential. A fix must add those server-side data dependencies while preserving the existing `ProviderUsage` and UI contracts.

## Scope warning

The issue uses the word "bars," but the exact candidate’s `UsageSection.tsx:33-45` renders text-only `WindowRow` elements and does not use `components/session-brief/Meter.tsx`; the only current meter is used by Context. The user has resolved this wording in favor of the existing usage-row treatment. A data-only approach adds Weekly/Session rows and percentages without changing UI files.
