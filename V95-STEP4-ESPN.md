# V95 Step 4 — ESPN secondary NFL research

Added `v95-espn-nfl.js`, loaded only on the V95 development branch.

Functions:
- `CurrentscyESPNNFL.scoreboard({dates:'YYYYMMDD'})` fetches a current NFL scoreboard and normalizes game ID, teams, date and state.
- `CurrentscyESPNNFL.summary(eventId)` validates a game summary and reports whether player box scores are present, without redistributing raw stats.
- `CurrentscyESPNNFL.crossCheckGame(a,b)` compares the game ID and both team IDs, **not** player metrics or injury status.

**Restrictions:** ESPN site endpoints are publicly accessible but not a documented licensed commercial data feed. This module is research-only and explicitly sets `publicDisplayAuthorized:false` and `commercialUseAuthorized:false`. No ESPN data enters the V95 licensed multi-source verification pipeline or changes public predictions. No PFF data is used.

**Still required:** run endpoint smoke tests, confirm ESPN terms/rights, obtain licensed data for a commercial product, map reliable player identities across sources, verify injuries and coverage assignments, and perform walk-forward historical probability calibration.

The current live website remains untouched. The V95 footer is V95; no production release is claimed.
