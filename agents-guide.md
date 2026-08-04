# Using `agents.md` with AI Coding Tools

A practical guide for external developers on how to point Claude, Cursor, v0, ChatGPT, or any other LLM-based tool at the 1Health `agents.md` docs so it writes correct API calls on the first try.

---

## What `agents.md` is (in one paragraph)

Every route in the 1Health BoCore API has a corresponding `agents.md` file: a single markdown page with everything an AI agent needs to call that route correctly — request/response schemas, field types, required flags, real JSON examples, every error code, auth requirements, and links to child routes. It's generated automatically from the actual Java source, so it never drifts from what the API really does. You don't need an API key, a login, or any tooling to read one — it's a static markdown file at a predictable URL.

---

## Step 1 — Find the URL for the route you need

```
https://mcp.<host-env>.1hdev.io/agents-docs/<env>/<route>/agents.md
```

`<host-env>` is the MCP server you're hitting (`dev`, `demo`, or `prod`). `<env>` in the path is which doc set to read — usually the same as `<host-env>`, but not always (e.g. you can hit the `dev` server while reading `demo` docs).

Path parameters (`{id}`, `{patientId}`, etc.) become underscore-delimited folders:

| Route | URL |
|---|---|
| `/v3/patient/find` | `https://mcp.dev.1hdev.io/agents-docs/demo/v3/patient/find/agents.md` |
| `/v3/patient/{id}` | `https://mcp.dev.1hdev.io/agents-docs/demo/v3/patient/_id_/agents.md` |
| `/v3/patient/{patientId}/address/{addressId}` | `https://mcp.dev.1hdev.io/agents-docs/demo/v3/patient/_patientId_/address/_addressId_/agents.md` |

**Not sure which route you need?** Start at the index and drill down:

```
https://mcp.<host-env>.1hdev.io/agents-docs-index
```

It lists every route group (`/v2`, `/v3`, `/admin`, …) with links. You can also scope the index to a single top-level group instead of browsing the whole thing:

```
https://mcp.<host-env>.1hdev.io/agents-docs-index/<group>
```

e.g. `https://mcp.dev.1hdev.io/agents-docs-index/patient` shows only patient-related routes. Each `agents.md` file also ends with a **Child Routes** table linking one level deeper, so you can navigate from a parent route down to the exact endpoint you're integrating with.

---

## Step 2 — General workflow (applies to every tool)

1. Identify the route you're integrating with.
2. Fetch (or open) its `agents.md` URL.
3. Give that content to your AI tool as context — how you do this differs per tool (see below).
4. Ask the tool to write the integration code. Because the file already contains real request/response JSON and every error code, the agent doesn't need to guess field names or hallucinate a schema.

The rest of this guide is just "how do I get the markdown into the tool" for each one.

---

## Claude (claude.ai, Claude Code, Projects, API)

**Claude Code (this CLI) or claude.ai chat with web access:**
Just paste the URL into your prompt:

> "Read `https://mcp.dev.1hdev.io/agents-docs/demo/v3/patient/agents.md` and write a function that creates a patient record."

Claude will fetch the page itself and use it as ground truth.

**Claude Projects:**
Add the `agents.md` URL (or paste its raw content) into the Project's **Knowledge** panel. Every route you're actively integrating with should live there — it persists across chats in that project, so you don't need to re-paste it each session.

**Claude API / Agent SDK (building your own agent):**
Fetch the markdown server-side and inject it into the system prompt or as a tool result before the model needs to make the call:

```python
import httpx

doc = httpx.get("https://mcp.dev.1hdev.io/agents-docs/demo/v3/patient/agents.md").text

messages = [
    {"role": "system", "content": f"Reference documentation for this API route:\n\n{doc}"},
    {"role": "user", "content": "Create a patient named Jane Doe, born 1990-05-15."},
]
```

If your agent has real web-fetch tool access (MCP `fetch`, a browsing tool, etc.), you can also just tell it the URL and let it retrieve the doc itself instead of pre-fetching.

---

## Cursor

Cursor doesn't auto-browse URLs by default, so bring the content in explicitly:

- **Quick task:** paste the `agents.md` URL or its raw content directly into the chat/composer prompt along with your request.
- **Ongoing integration:** save the fetched markdown as a file inside your repo (e.g. `docs/api-refs/patient.agents.md`) and `@`-mention it in chat (`@patient.agents.md`) so Cursor keeps it in context across the session.
- **Project-wide convention:** if you're integrating against several routes repeatedly, keep them under a folder like `.cursor/api-docs/` and reference the relevant file per task. Cursor indexes files in the repo, so once they're saved locally they're searchable without re-pasting.

---

## v0 (Vercel)

v0 does not fetch external URLs during generation, so you must paste content directly:

1. Open the target `agents.md` URL in your browser and copy its contents (or `curl` it).
2. Paste the markdown into the v0 chat before your instruction, e.g.:

   > "Here is the API reference for `/v3/patient`: `<paste agents.md content>`. Build a form that submits to this endpoint using the request schema above."

Keep the pasted doc scoped to the one or two routes you actually need — v0's context is prompt-based, so trimming to the relevant `agents.md` (rather than pasting the whole `index.md`) gets better results.

---

## ChatGPT / other LLMs with browsing or file upload

- **With browsing enabled:** paste the URL and ask it to fetch and use it, same as Claude.
- **Without browsing:** download the `agents.md` file and upload it as an attachment, or paste the raw markdown into the prompt.
- **Custom GPTs / Assistants API:** add the `agents.md` files you need as **Knowledge** files, or fetch them at request time via a browsing/retrieval tool if you're building a custom agent.

---

## Any other AI tool (general rule)

If a tool supports either of these, you can use `agents.md`:

1. **It can fetch a URL** → give it the URL directly.
2. **It accepts pasted text / file uploads / a "knowledge" or "context" panel** → fetch the markdown yourself (browser, `curl`, `httpx`) and paste or upload it.

There's no special parsing required — it's plain markdown with normal headers, tables, and fenced JSON code blocks. Any LLM can read it as-is.

---

## Tips for better results

- **Fetch the specific route, not the whole index.** `agents-docs-index` is for discovery (finding the right route); the per-route `agents.md` is for implementation (making the actual call). Giving an agent only the index for a coding task wastes context and omits the schema it actually needs.
- **Use the Child Routes table to navigate, not to skip ahead.** If you need `/v3/patient/{patientId}/address`, start at `/v3/patient/agents.md`, follow the child link, and you'll land on the exact file with that route's schema.
- **Re-fetch periodically.** These files regenerate automatically every 6 hours directly from the API's source code. If you've pasted an old copy into a Cursor repo or a Claude Project, refresh it occasionally rather than treating it as a one-time copy.
- **Match your environment.** The `<env>` segment in `/agents-docs/<env>/...` may differ from the host you're hitting — e.g. `demo` docs may include endpoints not yet live in `prod`. Use the `<env>` that matches what you're actually integrating against, regardless of which `mcp.<host-env>` server you're calling.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 on the `agents.md` URL | Route doesn't exist yet in that environment, or the path-to-URL mapping is off — double check that `{param}` segments were replaced with `_param_`. |
| Agent invents fields not in the doc | You gave it the wrong route's file, or an older cached copy — re-fetch and confirm the route matches. |
| Agent ignores the doc and hallucinates anyway | Some tools deprioritize pasted context under a long conversation. Re-paste the doc closer to your final instruction, or reference it explicitly in the same message as the request. |
