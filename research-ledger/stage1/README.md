# Stage 1 — multi-sport evidence collection

This additive collector does not modify the website UI, existing game simulation, or picks.

- Sources: public, **unofficial** ESPN daily scoreboard endpoints for NFL, NCAA football, NBA, NHL, and nine soccer competitions.
- Cadence: GitHub Actions every six hours (best effort; scheduled workflows can be delayed or disabled).
- Window: yesterday through three days ahead in UTC; game timestamps are stored in source ISO format.
- Output: `research-ledger/stage1/latest.json` (a latest snapshot, **not** an immutable historical archive).
- Provenance: source URL, collection timestamp, source event/team IDs, per-request success/failure.
- Missing data: injuries, starters, and player statistics explicitly remain null/unverified; scoreboard records are not substitutes.
- Limits: ESPN's endpoints are undocumented, availability and rights are not guaranteed, and a failed request cannot be interpreted as no games. The current run does not independently verify provider data.
- Coverage gaps: other soccer leagues, UFC, tennis, MLB, lineup feeds, injury feeds, player box scores, cross-source identity matching, pregame prediction capture, and historical accuracy are **not yet integrated**.
- Next: add authorized sport-specific injury/lineup/player feeds, source reconciliation, and a durable history store; only then evaluate model changes.

Run locally: `python -m unittest discover -s scripts -p 'test_stage1_collector.py'` and `python scripts/stage1_collect.py`.
