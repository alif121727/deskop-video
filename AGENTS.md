# AGENTS.md

## Repo & auto-sync

- Remote: `https://github.com/alif121727/deskop-video` (branch `main`).
- `scripts/auto-push.sh` commits and pushes every 10 minutes
  (`INTERVAL=600`). Start it with
  `nohup ./scripts/auto-push.sh > /tmp/auto-push.log 2>&1 &`,
  stop it with `pkill -f auto-push.sh`. Logs go to `/tmp/auto-push.log`.

## What this project is

Sinema AI Studio — a zero-dependency Node static server + vanilla-ESM browser app for
writing AI video prompts, splitting a story into 4/6/8-second clips, and planning
monetization. UI copy and code comments are in Indonesian. Keep new user-facing text
in Indonesian.

## Commands

```bash
npm start              # default port 12000
PORT=12001 npm start   # second port
npm run check          # node --check on server.js and every public/js module
```

There is no bundler, no test framework, and no runtime dependency. Do not add npm
dependencies without a strong reason — the project is deliberately dependency-free.

## Architecture

- `server.js` — static file server, `POST /api/ai/text`, `POST /api/ai/video/start`,
  `POST /api/ai/video/fetch`, `GET /api/health`. API keys arrive per request from the
  browser and are never stored server-side. Code files (`.js/.mjs/.css/.html`) are served
  with `cache-control: no-cache` plus a weak ETag so edits show up without a hard reload.
  The video fetch route is restricted to an allowlist of provider hosts — keep it that way.
- `public/js/state.js` — shared state (`ROUTES`, `state.draft`, `state.storyboard`).
  Also owns `RESERVED_PLACEHOLDERS`, `collectPlaceholders`, `newDraft`, `newStoryboard`,
  and `seedStoryboardFromDraft` (Studio → storyboard handoff).
- `public/js/data/` — content only: `templates.js` (25 video templates, `SCENE_FIELDS`,
  `VAGUE_WORDS`), `playbook.js` (`VIDEO_LIMITS`, `AUDIO_CUES`, monetization plan).
- `public/js/lib/` — `prompt.js` (S.C.E.N.E. compose + audit), `store.js` (localStorage:
  settings, keys, projects), `ai.js` (provider calls), `utils.js` (`el`, `qs`, `uid`, …).
- `public/js/views/` — one module per route, each exporting a single `renderX()`.

## Conventions and gotchas

- Placeholders use both `{name}` and `[name]`; `fillPlaceholders` handles both.
- Placeholder names that are auto-filled (`duration`, `ratio`, `aspect`, the S.C.E.N.E.
  keys) live in `RESERVED_PLACEHOLDERS` so they are never reported as "unfilled".
- Filling a scene's exclusions slot counts as providing exclusions — the audit checks
  `hasExclusionSlot`, not just for a negative-prompt field.
- `uid` is defined in `lib/utils.js` and re-exported from `lib/store.js`. Import it from
  `utils.js` in new code.
- Do not repaint a whole list from an `oninput` handler — it steals focus mid-typing.
  Update the affected node in place (see `updateShotPreview` / `updateLockLine` in
  `views/storyboard.js`).
- `el()` takes `(tag, attrs, children)`; event handlers are `onclick` / `oninput` / `onchange`.

## Deploy

Aplikasi ini butuh proses Node yang hidup (server sekaligus proksi agar bebas CORS).
Berkas siap pakai: `Dockerfile`, `render.yaml` (Render Blueprint), `fly.toml`, dan
`railway.json`. Jangan pakai hosting statis (GitHub Pages/Netlify/Vercel) — endpoint
`/api/ai/*` tidak akan ada dan kunci API bocor lewat browser. Langkah lengkap ada di
[`DEPLOY.md`](DEPLOY.md).

## AI provider notes

- Text default is `gemini-3.5-flash` in `public/js/lib/store.js` and the
  `textModels` list in `public/js/views/settings.js`. Older defaults
  (`gemini-2.5-flash`, `gemini-2.5-pro`) now return HTTP 404 "no longer available
  to new users" for fresh keys, so keep the default on a current model.
- Video requires a Google AI Studio key with Veo access. Without it every Veo
  model returns HTTP 404 for `predictLongRunning`. `providerError()` in
  `server.js` turns 401/403/404/429/500/503 into a short human hint so users see
  "needs Veo access" instead of a raw provider dump.
- Check a key without the UI:
  `curl "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY"` lists
  what the key can call.

## Verification without a test framework

Modules import cleanly in Node (`node --check`, then dynamic `import()`); view modules
only fail on `document is not defined`, which is expected. Exercise behavior through the
browser at the runtime host, and force a full reload (add a `?v=N` query) when a
hash-only navigation does not pick up module edits.

## Server must never die on one bad request

A browser `fetch` that cannot reach the server throws `TypeError: Failed to fetch`, which
the app surfaces as "Permintaan gagal" / "Request failed". That is almost always the
server process having crashed, not a provider error. Keep these guards in `server.js`:

- `serveStatic` uses `safeDecode` (a `decodeURIComponent` that returns `null` on malformed
  input like `/%`) instead of the raw call, which used to throw `URIError` and kill the
  process.
- `/api/ai/video/fetch` reads `await upstream.arrayBuffer()` **before** `res.writeHead(200)`,
  so a failure mid-download is handled by the `catch` without a second `writeHead`
  (`ERR_HTTP_HEADERS_SENT` in a `catch` becomes an unhandled rejection and exits Node).
- `http.createServer` wraps the router in `try/catch`, attaches `.catch()` to
  `handleApi(...)`, handles `clientError`, and registers `uncaughtException` /
  `unhandledRejection` handlers. Do not remove them.


## Free video fallback (no Veo access)

Accounts without Veo billing still get video. Settings has a "Sumber video" choice:

- `hf` (default) — Wan 2.2 on a public Hugging Face Space, no key required.
  `server.js` calls the Space's Gradio REST API: `POST /gradio_api/call/generate_video`
  returns an `event_id`, then `GET /gradio_api/call/generate_video/<event_id>` streams
  Server-Sent Events ending in `event: complete` (or `event: error`).
- `gemini` — Google Veo, needs a key with Veo access.

Public Spaces share an anonymous ZeroGPU quota. When it is exhausted the SSE stream
returns `event: error` with `data: null`; `hfVideoPoll` maps that to a clear "service is
busy, try again or switch to Veo" message. A successful run may fail minutes later for
that reason — it is the quota, not the code. Override the Space with `HF_VIDEO_SPACE`
(hostname only, e.g. `other-space.hf.space`) when the default is saturated; add that host
to `ALLOWED_VIDEO_HOSTS` automatically via the same env var.
