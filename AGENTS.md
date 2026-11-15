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

## Verification without a test framework

Modules import cleanly in Node (`node --check`, then dynamic `import()`); view modules
only fail on `document is not defined`, which is expected. Exercise behavior through the
browser at the runtime host, and force a full reload (add a `?v=N` query) when a
hash-only navigation does not pick up module edits.
