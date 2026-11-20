# Currentscy Picks — connected five-step prediction feedback loop

## 1. One model for website and archive
The NBA daily winner panel (`v87-daily-three.js`) and the server-side feedback collector both import `nba-shared-model.js`. The formula is the existing regularized team-record and home-court model, not a new or calibrated tactical simulator. Other sport simulations are not yet instrumented.

## 2. Capture actual pregame forecasts
`scripts/live-nba-feedback.cjs` runs on GitHub Actions every 15 minutes (best effort), queries the ESPN NBA scoreboard, applies the same shared formula, and writes a forecast only when the server clock is strictly before scheduled tip-off. Forecasts include the model version, timestamp, game/team IDs, records, probability, and source URL. A missing current-season record means no prediction. The script never creates backdated predictions. These are **scheduled runs of the same forecast function**, not captures of individual user sessions or their 100,000-simulation output.

## 3. Capture completed outcomes and score
When ESPN marks the game completed and both final scores are numeric, the collector records the actual home-win result for an existing forecast. This is ESPN source-confirmed but **not independently verified across providers**. Stage 3 computes Brier/log loss; Stage 4 reports results by sport/month and compares eligible paired models. The forecast game index preserves game IDs and kickoff timestamps beyond Stage 2's short latest window. No predictions are fabricated when a workflow misses a game.

## 4. Connect all research scripts
The six-hour unified research workflow runs:
- `stage1_collect.py` — source-attributed multi-sport schedule and scores
- `multisport-refresh.py` — legacy wider scoreboard monitoring
- `automatic-research.py` — NFL/NCAA research audit
- `stage5_archive.py` — content-hashed pregame and final evidence snapshots
- `stage2_reconcile.py` — provider-qualified game/team identity and conflict checks
- `stage3_evaluate.py` and `stage4_audit.py` — forecast evaluation
- `research_consistency.py` — unified health report comparing old/new ESPN ledgers and reporting mismatches, unmatched outcomes, and data coverage

The former standalone legacy schedules are disabled to reduce duplicate polling and concurrent commits; they remain manually runnable. The 15-minute NBA feedback workflow also runs Stage 3/4 and the research consistency report when Stage 2 exists.

## 5. Tests and safe deployment
Node tests cover shared-model math and final-score extraction; Python tests cover pregame timestamps, invalid outcomes, paired comparison, research conflicts, and evidence archive deduplication. Both workflows run tests before writing. They can be viewed under GitHub Actions. **Successful scheduled execution has not yet been verified.**

**Important limitations:** The live website's other sport simulators, player props, injuries, and 100,000-run simulations are not yet wired to this archive. GitHub Actions is best-effort and can be delayed; the repo archive is append-only by script convention, not tamper-proof. The model has no independent provider confirmation or prospective accuracy proof. Deployment gates remain closed; model weights and existing website UI are not automatically modified. Avoid interpreting ESPN-on-ESPN agreement as independent verification.

Outputs:
- `research-ledger/stage3/pregame-predictions.json`
- `research-ledger/stage3/verified-outcomes.json`
- `research-ledger/stage3/game-index.json`
- `research-ledger/stage3/evaluation.json`
- `research-ledger/stage4/report.json`
- `research-ledger/feedback-health.json`

Next engineering milestones: verify GitHub Actions logs, capture every sport's actual simulator through shared modules or authenticated server-side prediction generation, add independently confirmed injury/player results, and validate changes on forward-in-time holdouts before activation.
