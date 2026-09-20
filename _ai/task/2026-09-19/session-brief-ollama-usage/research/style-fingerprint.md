# Style cheatsheet

- TypeScript ESM; use explicit relative imports and `import type` for type-only dependencies (`server/usageOllama.ts:1`, `server/usageAnthropic.ts:1-3`).
- Keep provider adapters small and function-oriented; return the shared `ProviderUsage` shape rather than provider-specific classes (`server/usageChatgpt.ts:37-101`, `server/usageAnthropic.ts:38-104`).
- Treat upstream payloads as `unknown`; validate records, arrays, strings, and finite numbers before mapping (`server/usageAnthropicParse.ts:3-59`, `server/usageChatgptParse.ts:7-41`).
- Clamp percentages to the shared 0–100 contract; do not invent a percentage for missing or non-numeric values (`contract.ts:19-22`, `usageAnthropicParse.ts:7-12`, `usageChatgptParse.ts:28-31`).
- Preserve optional timestamps only when the upstream value is a string or a known numeric epoch conversion is explicitly supported (`usageAnthropicParse.ts:19-25`, `usageChatgptParse.ts:32-35`).
- Use `fetch` with explicit method, JSON accept header, `redirect: "error"` where relevant, and `AbortSignal.timeout(...)` (`usageOllama.ts:29-35`, `usageChatgpt.ts:19-27`).
- Map 401/403 to `unauthenticated`; map transport and non-success conditions to an empty safe result or cached valid usage, never made-up numbers (`usageChatgpt.ts:50-69`, `usageAnthropic.ts:71-102`).
- Read auth files through `bb.sdk.files.read`; decode base64 if indicated; catch read/parse errors; never log contents or use refresh tokens (`server/authFiles.ts:45-75`, `README.md:57-63`).
- Prefer the existing usage cache and backoff helpers for successful windows and transient upstream failures (`server/usageCache.ts:3-59`).
- Tests use Node’s built-in `node:test`, `assert/strict`, and pure parser/auth fixtures with privacy assertions (`server/usageChatgpt.test.ts:1-7`, `server/grokAuth.test.ts:1-9`, `server/grokAuth.test.ts:11-27`).
- Preserve the current UI contract; usage data is rendered by `UsageSection`, not fetched or transformed in React (`UsageSection.tsx:71-99`).
