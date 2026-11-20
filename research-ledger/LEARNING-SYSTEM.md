# Currentscy Picks: prediction learning and calibration

## What is connected
- The shared NBA record/home-court model is used by the browser and the server-side NBA pregame archive.
- A separate, clearly labeled team-sport research baseline collects pregame predictions when enough historical final scores exist. This is **not** the same as the tactical website simulator.
- Archived forecasts are locked by stable prediction IDs and are never rewritten after kickoff.
- Final score collectors attach outcomes to those IDs after ESPN reports completion.
- Stage 3 calculates Brier score, log loss and calibration bins. Stage 4 groups results by sport/month.
- `scripts/forecast_vs_results.py` writes `research-ledger/forecast-vs-results.json` with matchup, forecast timestamp, pick, probability, actual final score, and game-level Brier error. `v-learning-feedback.js` displays real scored examples inside the sports listing when available.
- `scripts/learning_calibration.py` fits a regularized two-parameter probability calibration using chronological training data, checks a held-out later period, and publishes `research-ledger/learning/report.json` and `learning/shadow-config.json`.
- Future server-side forecasts may include a **shadow** adjusted probability if sufficient evidence shows an improvement. The original model probability remains unchanged, and later results compare frozen shadow and original forecasts on the same games.
- Both scheduled GitHub Actions workflows run the learning and matchup reports; the hourly ChatGPT automation checks for real milestones.

## Critical limits and safeguards
- Historical games from before forecast archiving began **cannot** be used for honest predicted-versus-actual comparisons. Their final scores may help form future research baselines, but no historical forecast may be reconstructed.
- No verified final outcomes were saved at the last inspected run on 2026-11-20 23:43 UTC. The 48 genuine pregame forecasts have not yet been scored.
- Shadow calibration requires at least 60 chronological training outcomes and 30 held-out outcomes for a candidate; 200 scored games per sport plus improved Brier and log loss are the minimum for considering promotion. Promotion is not automatic.
- **No self-modifying live prediction model is activated.** The calibration system refits shadow parameters automatically, but live deployment requires independent provenance review and a versioned release. This prevents learning from leakage, noise, or small samples.
- The website's 100,000-run tactical simulations for NFL, NCAA, NHL, soccer, MLB, UFC and tennis are **not yet directly archived**. Research-only baselines do not count as that integration.
- UFC and tennis match-level coverage remains incomplete; no automatic fighter/player probabilities are fabricated from sparse feeds.
- ESPN final scores are single-provider evidence, not independent verification.

## Inspect evidence
- [Workflow runs](https://github.com/currentscy/Currentscy-Picks/actions)
- [Forecasts](https://github.com/currentscy/Currentscy-Picks/blob/main/research-ledger/stage3/pregame-predictions.json)
- [Outcomes](https://github.com/currentscy/Currentscy-Picks/blob/main/research-ledger/stage3/verified-outcomes.json)
- [Prediction versus final](https://github.com/currentscy/Currentscy-Picks/blob/main/research-ledger/forecast-vs-results.json)
- [Learning report](https://github.com/currentscy/Currentscy-Picks/blob/main/research-ledger/learning/report.json)

The validation milestone is **not complete** until at least one actual saved pregame forecast has a matched, scored final result. Genuine improvement is a separate, later milestone requiring sufficient out-of-sample games.
