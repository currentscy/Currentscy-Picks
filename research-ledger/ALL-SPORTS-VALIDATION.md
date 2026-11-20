# Currentscy Picks — next five-step all-sport data update

## Step 1 — Save every event we can actually observe
`scripts/unified-event-ledger.py` polls the public ESPN scoreboard feeds for NFL, NCAA football, NBA, NHL, MLB, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, Liga MX, UCL, UEL, UFC/MMA, ATP, and WTA. It persists previously seen games in `research-ledger/unified-events.json`, with IDs, scheduled start, competitors, source URL, observed time, completed status, and scores where provided. Individual-sport athlete IDs are extracted when exposed. Coverage is best effort, not a guarantee of every match or fight. UFC/tennis feeds can be incomplete or incompatible.

## Step 2 — Protect the history
The collector merges new observations with historical records, retains the first observation time, and does not overwrite a previously completed event with a later incomplete scoreboard response. The existing Stage 5 content-hashed snapshots remain an additional evidence layer. Git history and repository permissions are still needed to protect against malicious rewriting.

## Step 3 — Separate saved fixtures from genuine predictions
`scripts/validation_dashboard.py` compares actual pregame model forecasts with the event ledger and final results. A fixture is not treated as a prediction. It rejects forecasts with timestamps at/after kickoff, missing events, invalid probabilities, duplicate IDs, and outcomes without a completed event. Its per-sport report counts events, completed games, valid forecasts, and matched outcomes. The existing shared-model NBA capture remains the only actual forecast integration. Other sport simulators are **not** automatically archived yet.

## Step 4 — Connect existing research
The unified six-hour workflow runs the new event collector alongside Stage 1–5, the legacy multisport collector, NFL/NCAA research, reconciliation, scoring, and research consistency. `research_consistency.py` now includes the unified event ledger and coverage checks. The 15-minute NBA forecast collector remains separate because capturing predictions before kickoff requires a faster cadence than full research refresh.

## Step 5 — Test and expose honest coverage
Unit tests exercise persistence, non-regression of final scores, pregame-only forecast gating, and final-result matching. The workflow must pass these before committing. `research-ledger/unified-coverage.json` records success/failure by sport and does not claim complete coverage. `research-ledger/validation-dashboard.json` shows whether the five evidence gates have real data.

**Not yet established:** successful GitHub Actions runs, exhaustive UFC/tennis event coverage, true live simulator forecast capture for NFL/NCAA/soccer/NHL/MLB/tennis/UFC, independent source verification, or improved predictive accuracy. No automatic model updates are enabled. A blank feed or absent forecast is reported as missing evidence, never filled with an invented prediction.

For a production-grade every-event guarantee, add sport-specific licensed/authorized feeds, pagination and retries, an independent durable database/queue, and server-side hooks in each sport's actual simulation engine. GitHub Actions and unofficial ESPN scoreboards alone cannot guarantee every event or near-real-time capture.
