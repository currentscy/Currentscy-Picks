# Stage 4 — Paired model evaluation and learning diagnostics

Stage 4 adds `scripts/stage4_audit.py`, scheduled after Stage 3, producing `research-ledger/stage4/report.json`. It groups actual, pregame prediction evaluations by sport and kickoff month, computes baseline Brier/log loss, and compares baseline and candidate **on the same games** when candidate evidence passes basic timestamp and provenance checks.

**This is not an automated model improvement or deployment.** The live website and simulation are untouched. With no archived predictions and verified outcomes, the output reports zero evaluated predictions rather than invented performance. Source-provided `verified` and `candidateEvidenceAuthenticated` flags are not independently audited; their presence alone cannot establish trustworthy results. The deployment gate always remains closed.

Paired Brier and log-loss deltas are candidate minus baseline (negative favors candidate). A minimum paired sample of 200 is a review threshold, **not** statistical proof of improvement. A production decision also requires immutable timestamped pregame exports, trusted verified outcomes, independently authenticated evidence, forward-in-time holdouts, confidence intervals, monitoring for calibration drift, and a reviewed rollback plan.

Stage 4 currently depends on the short-window Stage 2 snapshot. Older predictions may be unscorable if their games are not present. Next engineering work is immutable prediction/result capture and actual provider integrations before attempting to tune simulation parameters.

Tests: `python -m unittest discover -s scripts -p 'test_stage4_audit.py'`.
