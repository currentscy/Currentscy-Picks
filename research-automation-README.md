# Automated research pipeline

GitHub Actions runs every six hours and can also be started manually under Actions > Currentscy Picks automatic research collection.

## Current implemented behavior
- Collects NFL and NCAA ESPN scoreboard events from the last nine calendar days.
- Records kickoff, participants, final scores, and first-observed timestamps in research-ledger/games.json.
- Checks research-ledger/pregame-predictions.json for timestamped, sourced model forecasts made before kickoff.
- Publishes research-ledger/audit.json; does not modify the live prediction engine.

## Critical missing integrations
1. The live Currentscy Picks five-leg player prediction engine does not yet export immutable pregame predictions to a persistent backend. GitHub Pages is static, and GitHub Actions cannot read a visitor's browser memory.
2. Player-specific outcomes must be matched to game, player and market and independently verified before the backtest can run.
3. Coach identities, defensive charting, and model version provenance need auditing.
4. Held-out evaluation and calibration are not automatic until both prediction and outcome records exist.
5. No automatic promotion to live picks is permitted. Activation requires a separately reviewed release.

## Safety
Never store API keys in this repository or in pregame-predictions.json. The job uses only public ESPN scoreboard data. Missing data is never filled with invented predictions. GitHub Actions scheduling is best effort and requires Actions to be enabled with repository write permission. The job may be delayed or disabled by GitHub.
