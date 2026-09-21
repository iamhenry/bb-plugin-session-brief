# UX behavior

## Current UX

1. The user opens the Session Brief usage section from the thread header.
2. For a model string containing `ollama` or `llama`, the server selects the Ollama provider branch (`server/providerFamily.ts:29-38`).
3. The server probes only the local Ollama daemon (`server/usageOllama.ts:29-35`). Cloud sign-in is not consulted.
4. The returned provider has no windows and an "Ollama Cloud has no remaining-% API" message (`server/usageOllama.ts:37-64`).
5. The usage headline displays that message (`UsageSection.tsx:20-31`). The expanded provider row displays the provider name but no Weekly or Session values (`UsageSection.tsx:48-67`).
6. The retained reproduction records the observed message and absent values (`reproduction/result.md:7-27`); the screenshot receipt is `reproduction/screenshots/reporter-issue-1.png`.

## Post-change UX

1. The user opens the same Session Brief usage section; no navigation, control, layout, or styling changes.
2. For a valid Ollama Cloud credential, the server returns two validated windows labeled Weekly and Session. The existing usage view renders their labels, reset text when available, and remaining percentages using its current formatting (`UsageSection.tsx:20-45`).
3. For a missing or rejected credential, the server returns an unauthenticated provider with a readable sign-in message and an empty window list. The view shows the message and no numeric values.
4. For malformed, out-of-range, timed-out, or unavailable upstream data, the server returns no fabricated windows and does not throw through the RPC.
5. The exact candidate’s UsageSection has text rows rather than a progress-bar element. The authoritative target is this existing row/percentage rendering; no new meter component or display change is required.
