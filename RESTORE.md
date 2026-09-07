# RESTORE.md — Grassy Hill Tee Sheet

What a fresh `git clone` does NOT bring back, and how to check each item.
Written 2026-08-29. Everything below was verified that day unless marked otherwise.

## 1. Hosting — GitHub Pages

- Repo: `kvander369/grassy-hill-groups` — **PUBLIC** (Pages on a free account needs it).
- Pages source: branch `main`, path `/` (root). Live URL:
  https://kvander369.github.io/grassy-hill-groups/
- Every `git push` to `main` deploys within ~1 minute. There is no build step.
- Check: `gh api repos/kvander369/grassy-hill-groups/pages --jq '.source, .status'`
  should show `main`, `/`, `built`.
- If Pages is ever off: repo Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## 2. Data — Supabase

- Project "Grassy Hill Tee Time Maker", id `lackcooiarpahgmkrpeu`,
  URL `https://lackcooiarpahgmkrpeu.supabase.co`.
- The pages embed the **publishable** key (public by design; RLS is the protection).
  It is in `index.html` and `week.html` as `SUPABASE_KEY`.
- Tables the app depends on (all four are used by both pages):

  | table | purpose | columns the code touches |
  |---|---|---|
  | `players` | roster | `id`, `name`, `handicap` |
  | `rounds` | one row per saved tee sheet | `id`, `played_date`, `format_name` (always `'Generated'`), `group_size` |
  | `round_groups` | who was in which group | `round_id`, `group_number`, `player_id`, `handicap` |
  | `settings` | app knobs | `key`, `value`, `updated_at` — keys `lookback_weeks`, `flight_a_max`, `flight_b_max`, `weight_random` (check `loadSettings()` in `index.html` for the current list) |

- Keys and DB password: `..\secrets\grassy-hill\` (never in this folder, never in any cloud).
  As of 2026-08-29 the values are in `grassy-hill-from-desktop.txt`; `supabase_credentials.md`
  is an unfilled template. Rotated 2026-08-28; legacy anon/service_role keys are disabled.
- **Backups exist as of 2026-09-07** — `backup.js` in this folder, run weekly by the scheduled
  task **"Grassy Hill weekly backup"** (Mondays 04:20). It writes a dated folder to
  `..\secrets\grassy-hill\backups\` holding one `.json` per table, `schema.sql` +
  `schema-openapi.json`, and a `manifest.json` of row counts; it appends one line per run to
  `backups\backup.log`. It uses only the publishable key for data (the secret key, if present
  in the secrets folder, is used only to read the schema). It never deletes; old backups
  accumulate at roughly 150 KB each.
  - Backups hold the players' **real names**, so they live in the secrets folder and never in
    this public repo.
  - If the project is paused, the script writes nothing and logs `SKIPPED` (exit 2) rather
    than leaving an empty backup that looks successful. Verified 2026-09-07 against a
    non-resolving host.
  - Check a backup: `node restore.js` (newest) or `node restore.js YYYY-MM-DD`. It parses every
    file, compares counts to the manifest, and follows every foreign key. Verified 2026-09-07
    that it reports FAILED on a damaged copy (a deleted player left 16 orphaned group rows).
  - Put one back: `node restore.js YYYY-MM-DD --write --target-url=... --target-key=...`.
    It refuses the live project unless `--live` is also passed, and only inserts, never deletes.
  - **Still untested: an actual restore into an empty project.** The check passes and the SQL is
    generated, but no restore has been performed, so this is a backup that has never been
    restored. Doing it needs a scratch Supabase project (Kyle's login).
  - `schema.sql` is derived from the REST API's schema, not `pg_dump` (no `psql` on this
    machine). It carries columns, types, primary keys, foreign keys and NOT NULL, but **not
    defaults, indexes, triggers or the RLS policies** — after a restore into a new project, RLS
    must be re-enabled and its policies rewritten by hand or the new project is wide open.

## 3. Logins

- No user login in the app. Anyone with the URL can use it.
- Supabase dashboard login is Kyle's; GitHub is `kvander369`.
- Leaderboard (the club's official sign-up site, https://leaderboard.systems/GHWGA9/) is
  Annie's login. The app does not talk to Leaderboard (a scraper was investigated 2026-08-29
  and declined by the users).

## 4. Local seat files (gitignored, per machine)

- `RESUME-Claude.bat`, `seat-check.ps1` — Claude Code seat launcher; recreate from another
  project's copy if missing.

## 5. Quick smoke test after a restore

1. Open the live URL. Roster loads (players appear) → Supabase reachable, key valid.
2. Check 2+ players → "Generate Groups" (needs a size) and "Make My Own Groups" light up.
3. `week.html?date=YYYY-MM-DD` for a known saved date shows that sheet.
