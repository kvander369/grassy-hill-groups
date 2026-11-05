# CLAUDE.md — Grassy Hill Tee Sheet

A tee-sheet / groups web app for the Grassy Hill golfers ("the girls"), who use it and like it.
Two static pages (`index.html`, `week.html`) plus a logo, hosted on **GitHub Pages** at
https://kvander369.github.io/grassy-hill-groups/ from the `main` branch of the **PUBLIC** repo
`kvander369/grassy-hill-groups`. Data lives in Supabase project "Grassy Hill Tee Time Maker"
(`lackcooiarpahgmkrpeu`), reached from the browser with the publishable key embedded in the
pages (public by design; Row Level Security is the protection — never put a secret key here).

## Facts

- No login, no service worker, no manifest: users just load the page (10-minute cache).
- Secret key and DB password live in `..\secrets\grassy-hill\` — never in this folder.
  Check: `git grep -E "sb_secret_[A-Za-z0-9_-]{20,}"` prints nothing. The same pattern with
  `sb_publishable_` must print hits, which shows the scan can find a key.
- **The repo is PUBLIC** (GitHub Pages on a free account needs that). So: never commit a
  real name, phone, email or handicap of a player — see how mixed-up-golf handled the same
  problem (invented names in tests/demo data). If player data ever needs to be in the repo,
  stop and ask Kyle. Check: read `git diff --cached` before each push; there is no automated
  name scan.

## Users and features

- **Annie** runs the app for the group and may type into this seat directly; she has full say.
  Kyle owns the accounts (GitHub, Supabase). Both like brief, plain replies.
- Two ways to build a sheet, both in `index.html`, both saved via `saveRound()` as today's
  `rounds` row (`format_name: 'Generated'`) + `round_groups`:
  - **Generate Groups** — the mixer (needs a size + split; scores by pairing history).
  - **Make My Own Groups** — full-size empty spots per group (3 for
    threesomes…), tap a spot to pick from checked-in, unplaced players; × removes; `+ spot` /
    `+ Add a group`; empty spots/groups dropped on save. `manualMode` flag drives rendering.
    Roster **Clear** wipes the groups card (`clearResults()`); unchecking a placed player
    removes her from her group.
- Decided against: scraping Leaderboard (the club's sign-up site) for history, and importing
  old PDF tee sheets — the users don't want it. Feasibility notes are in memory if it returns.
- Test locally with `python -m http.server 8765` in this folder (a `file://` open works too),
  then open http://localhost:8765/index.html. The local page talks to the REAL database.

## Rules

- General rules for every seat: `C:\Users\vande\.claude\CLAUDE.md` (commit after verified,
  then `git push` — every push deploys the live site, so verify before pushing).
- Bump nothing blindly: a push goes live to the girls within a minute. Test in a local
  browser first (`start index.html`) or on a preview copy. Check after a push:
  `gh api repos/kvander369/grassy-hill-groups/pages --jq '.source, .status'` shows `main`, `/`,
  `built`; then the smoke test in RESTORE.md §5.
- `RESTORE.md` holds Pages settings, Supabase id/tables, where keys
  live, and the smoke test. Keep it current when any of that changes.
- **Backups.** `backup.js` + `restore.js` in this folder; scheduled task
  "Grassy Hill weekly backup" (Mondays 04:20) writes to `..\secrets\grassy-hill\backups\`.
  Costs nothing, no Supabase plan, all local. Details are in RESTORE.md §2. Check: `node
  restore.js` prints CHECK PASSED. The one gap left: **no restore has ever been performed** into
  an empty project. This project has no state file; that gap is its only open item.
- **The free project pauses after ~7 days idle** and the app goes dark for the girls. Check:
  `curl.exe -s -o NUL -w '%{http_code}' https://lackcooiarpahgmkrpeu.supabase.co/rest/v1/`. Paused,
  the hostname does not resolve (`curl` exit 6, DNS NXDOMAIN), which tells a pause from an app
  bug; running, it answers 401 without a key. **Kyle declined a keep-alive ping (2026-09-07)**,
  so expect this to recur — the fix is his to make in the dashboard, and `backup.js` is written
  to skip cleanly while it is paused.
  Resume brings it back in about 3–4 minutes (521 → 404 → 200), data intact. A seat
  cannot resume it — the dashboard needs Kyle's sign-in; open the project page for him with
  `Start-Process` (the Chrome-extension window is not on his screen), then poll
  `rest/v1/rounds?select=id&limit=1` with the page's publishable key until it returns 200.
