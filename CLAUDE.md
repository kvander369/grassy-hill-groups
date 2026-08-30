# CLAUDE.md — Grassy Hill Tee Sheet (Claude Code seat, created 2026-08-28)

A tee-sheet / groups web app for the Grassy Hill golfers ("the girls"), who use it and like it.
Two static pages (`index.html`, `week.html`) plus a logo, hosted on **GitHub Pages** at
https://kvander369.github.io/grassy-hill-groups/ from the `main` branch of the **PUBLIC** repo
`kvander369/grassy-hill-groups`. Data lives in Supabase project "Grassy Hill Tee Time Maker"
(`lackcooiarpahgmkrpeu`), reached from the browser with the publishable key embedded in the
pages (public by design; Row Level Security is the protection — never put a secret key here).

## Facts verified 2026-08-28 by backup-all

- No login, no service worker, no manifest: users just load the page (10-minute cache).
- Supabase keys rotated 2026-08-28 (new publishable + secret keys, legacy anon/service_role
  disabled, legacy JWT revoked, DB password reset). The pages were swapped to the rotated
  publishable key in `92a25fa`; the old key is deleted. Secret key and DB password live in
  `..\secrets\grassy-hill\` — never in this folder.
- 32-commit history scanned: no secret key ever committed, no personal data in the pages.
- **The repo is PUBLIC** (GitHub Pages on a free account needs that). So: never commit a
  real name, phone, email or handicap of a player — see how mixed-up-golf handled the same
  problem (invented names in tests/demo data). If player data ever needs to be in the repo,
  stop and ask Kyle.

## Users and features (2026-08-29)

- **Annie** runs the app for the group and may type into this seat directly; she has full say.
  Kyle owns the accounts (GitHub, Supabase). Both like brief, plain replies.
- Two ways to build a sheet, both in `index.html`, both saved via `saveRound()` as today's
  `rounds` row (`format_name: 'Generated'`) + `round_groups`:
  - **Generate Groups** — the mixer (needs a size + split; scores by pairing history).
  - **Make My Own Groups** (added `c3e021a`) — full-size empty spots per group (3 for
    threesomes…), tap a spot to pick from checked-in, unplaced players; × removes; `+ spot` /
    `+ Add a group`; empty spots/groups dropped on save. `manualMode` flag drives rendering.
    Roster **Clear** wipes the groups card (`clearResults()`); unchecking a placed player
    removes her from her group (`24fb6d7`). Accepted by the users 2026-08-29.
- Decided against: scraping Leaderboard (the club's sign-up site) for history, and importing
  old PDF tee sheets — the users don't want it. Feasibility notes are in memory if it returns.
- Test locally with `python -m http.server 8765` in this folder (a `file://` open works too),
  then open http://localhost:8765/index.html. The local page talks to the REAL database.

## Rules

- General rules for every seat: `C:\Users\vande\.claude\CLAUDE.md` (commit after verified,
  then `git push` — every push deploys the live site, so verify before pushing).
- Bump nothing blindly: a push goes live to the girls within a minute. Test in a local
  browser first (`start index.html`) or on a preview copy.
- `RESTORE.md` (written 2026-08-29) holds Pages settings, Supabase id/tables, where keys
  live, and the smoke test. Keep it current when any of that changes.
- Known gap: no backup of the Supabase data exists (see RESTORE.md §2). Kyle (2026-08-29):
  no paid Supabase plan; if built, it is a local weekly script (04:00 slot) writing to
  `..secretsgrassy-hillbackups` — still deciding.
