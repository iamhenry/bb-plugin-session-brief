# Session Brief

A [BB](https://getbb.app) plugin that pins a floating session snapshot on the
current thread: context fill, project/branch, **subscription remaining** for
the model you are using, subthreads, and agent todos.

No extra API keys. It reuses logins you already have (Pi, OpenCode, Codex CLI,
Claude Code). It never stores tokens, never refreshes OAuth (refresh would
sign you out), and never scrapes browser cookies.

## Install

```sh
bb plugin install git:https://github.com/iamhenry/bb-plugin-session-brief.git --yes
```

From a local checkout:

```sh
npm install
bb plugin install . --yes
```

Requires BB `>=0.39`. Git installs need `npm` on PATH (BB builds the app
bundle at install time).

Reload after edits:

```sh
bb plugin reload session-brief
```

## What you get

Open a thread and use the sliders control in the thread header.

| Section | Source |
| --- | --- |
| Context | BB `contextWindowUsage` for this thread |
| Project | BB project name + git branch when the environment is a repo |
| Usage | Remaining % for the **current model vendor**, not the agent harness |
| Subthreads | Child threads; click opens them. Finished threads show Done, errors show Error |
| Todos | This thread’s `pendingTodos` (read-only) |

### Usage vendors (zero extra login)

| Model looks like | Remaining % from |
| --- | --- |
| Grok / xAI | Pi or OpenCode `xai` OAuth → Grok billing (read-only) |
| Claude / Anthropic | Pi or OpenCode `anthropic` OAuth → Anthropic `/api/oauth/usage` (`limits[].percent`) |
| Codex / GPT / OpenAI | Pi `openai-codex` or OpenCode `openai` OAuth → ChatGPT `/wham/usage` |
| Cursor | BB `system.usageLimits` if Cursor CLI is signed in |
| Ollama | No remaining-% API (Cloud keys and the local daemon cannot provide it) |

If a vendor is not signed in, the row says so. It will not invent a percent.

## Security

- Auth files are read only (`~/.pi/agent/auth.json`, OpenCode `auth.json`, optional `~/.grok/auth.json`).
- Access tokens are used in-process for one GET; they are never logged or returned over RPC.
- OAuth **refresh tokens are never used or written**.
- No cookie files, no `ollama.com/settings` scrape.

## License

MIT
