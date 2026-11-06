---
name: manual-groups-design
description: "How the girls want \"Make My Own Groups\" to behave — full-size empty spots, tap to pick, they choose where the short group goes."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9ef21e96-b212-495c-92cd-622f1bc393bd
  modified: 2026-08-30T01:07:38.748Z
---

Shipped 2026-08-29 (`c3e021a`, Clear/uncheck fix `24fb6d7`); users confirmed "they love it". Design the users chose after two mocks:
1. Start with **empty** groups, not pre-filled ones ("why does it put them in when you start?").
2. Every group gets the **full nominal size** (3 spots for threesomes) even when the count
   doesn't divide evenly — they decide where the twosome goes and leave a spot blank; blanks
   are dropped on save. Do NOT put the short group last automatically.
3. Tapping a spot shows only checked-in players not yet placed.

**Why:** they often need specific pairings on particular days; the mixer can't know those.
**How to apply:** keep this interaction for any future manual/edit feature (e.g. editing a
generated sheet); don't "helpfully" auto-arrange.

Related: [[annie-is-the-user]]
