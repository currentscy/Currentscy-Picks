# Stage 3 — Offline model evaluation and safe activation gate

Stage 3 is the **measurement foundation**, not a claim of improved predictions.

The scheduled workflow now runs `scripts/stage3_evaluate.py` after Stages 1 and 2 and writes `research-ledger/stage3/evaluation.json`. The evaluator never modifies the public site or its simulation formula.

Inputs (optional, both arrays of JSON objects):
- `pregame-predictions.json`: `predictionId`, `gameKey`, `predictedAt` (timezone-aware ISO timestamp), `market`, `entityId`, `modelVersion`, `sourceUrl`, `baselineProbability` between 0 and 1.
- `verified-outcomes.json`: `predictionId`, `result` (0/1), `verified` (boolean), `verifiedAt`, `sourceUrl`.

For every archived prediction, the evaluator checks that it was made **before scheduled kickoff** and that its game exists in the Stage 2 data. Outcomes must be timestamped after kickoff and include a source URL and a verification assertion. Those assertions are not independently authenticated; do not interpret results as production-grade validation until an independent trusted source verifies them.

Metrics: Brier score, log loss, and 5 probability calibration bins. Candidate comparison uses paired predictions only; candidate evidence requires a dedicated authenticated gate. The current Stage 2 pipeline does not produce authenticated candidate features. No candidate is automatically promoted.

**Safety gate is deliberately closed:** `improvementEstablished: false`, `liveModelActivated: false`. A larger, independent evaluation set, trustworthy source authentication, immutable pregame snapshots, and out-of-sample testing are still required before modifying the site's probabilities.

**Current limitations:** the Stage 1/2 latest snapshots cover only a short schedule window, so older prediction records may be unscorable even if genuine. This version does not automatically export website predictions, ingest player results, persist immutable history, or connect live injuries. Those are the next engineering steps.

Test: `python -m unittest discover -s scripts -p 'test_stage3_evaluate.py'`.
