# Unified research integration — current architecture

## Connected scheduled pipeline

Both GitHub Actions workflows now run `scripts/integration_health.py` after their own data and analysis steps. It creates `research-ledger/integration-health.json` with each layer's freshness and error state. The website's `v-ai-research.js` reads this file alongside `research-ledger/ai/latest.json` and shows an evidence-based health count. The existing 15-minute NBA workflow and six-hour multi-sport workflow share a repository-write concurrency group.

**Research chain:** ESPN Stage 1 observations → Stage 2 provenance/reconciliation → unified historical events → real server-side NBA forecasts / non-NBA research baselines → final-score matching → Stage 3 scoring → Stage 4 paired model audit → walk-forward shadow calibration → AI research narrative → public read-only website panels → workflow health and validation monitor. Stage 5 archives evidence snapshots; consistency checks compare legacy and current research sources.

## Observed integration blocker

On November 20, 2026 at 4:11 PM Pacific, the actual AI report returned `HTTP 429` with `credit_balance_exhausted`. The repository's GitHub Actions secret is being passed to the API request; the OpenAI project needs usable API credits before an AI response can succeed. **No key should be pasted into the website or chat.** The new agent reports safe HTTP status and category without exposing credentials.

## What is connected versus what remains separate

- Connected: scheduled research collection, persistent event archive, NBA shared-model pregame capture, non-NBA *research baseline* pregame capture, outcome matching, evaluation, shadow calibration, AI evidence analysis, integration-health dashboard, and monitoring.
- Not established: completed-game scoring for the first forecast cohort; demonstrably improved calibration; live activation of shadow probabilities; direct archive capture of every sport's *website* tactical simulator; exhaustive UFC/tennis coverage; independent final-score corroboration; automatic source-code deployment.
- AI is advisory and does **not** edit predictions or production models. No live AI responses have succeeded while the API project has insufficient credits.
- A layer marked `ready` means a recent report exists, not that its model is accurate.

## Proof checks

1. GitHub Actions must show a successful scheduled run.
2. `research-ledger/integration-health.json` must show the expected layer states; stale/missing layers are explicit.
3. `research-ledger/ai/latest.json` must show `aiEnabled:true` and `status:ai-analysis-complete` to prove a real AI response.
4. `research-ledger/stage3/pregame-predictions.json` must contain a forecast timestamp strictly before kickoff, and `verified-outcomes.json` must contain a corresponding source-supported final result.
5. `research-ledger/stage3/evaluation.json` must score at least one such real outcome before claiming the feedback loop is fully validated.
6. `research-ledger/learning/report.json` must have sufficient chronological holdout observations and improved accuracy before any candidate can be considered for deployment.

**The code integrations have been committed. Full end-to-end live validation is still pending.**
