---
name: leaderboard-scrape-feasibility
description: "Leaderboard tee sheets are scrapeable plain HTML behind Annie's login; users declined the scraper (2026-08-29)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 9ef21e96-b212-495c-92cd-622f1bc393bd
  modified: 2026-08-30T01:07:31.607Z
---

Investigated 2026-08-29 and **declined by the users** — do not build unless asked again.

Findings if it returns: the club's sign-up site is https://leaderboard.systems/GHWGA9/ (Tee Times
list at `/TeeTimeBlock`, one sheet per week at `/TeeTimeDetail/<id>`, ids sequential — 6106 was
Sep 01 2026, 6105 Aug 25). Plain HTML: one box per tee time, each player as "Name / Flight X,
Crs Hcp: N". A few lines of JS pulled 9 slots / 26 names cleanly. Requires a login (anonymous
request 302s to /Account/Login); Annie's account with "remember me" would carry the session.
Plan would have been: dedicated bot Chrome profile (TeeTimeBot pattern, never Kyle's own) +
Playwright + write to Supabase with the secret key. Also declined: importing old PDF tee sheets.

**Why:** the users want their own manual grouping instead — see [[manual-groups-design]].
**How to apply:** if history back-fill comes up again, this is a one-session job; ask first.
