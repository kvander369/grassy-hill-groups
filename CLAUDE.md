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

## Rules

- General rules for every seat: `C:\Users\vande\.claude\CLAUDE.md` (commit after verified,
  then `git push` — every push deploys the live site, so verify before pushing).
- Bump nothing blindly: a push goes live to the girls within a minute. Test in a local
  browser first (`start index.html`) or on a preview copy.
- Write `RESTORE.md` in the first working session: Pages settings (main, root), the
  Supabase project id and where its keys live, the Sheet/tables the app depends on.
