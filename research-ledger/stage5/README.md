# Stage 5 — Evidence retention foundation

Stage 5 now runs `scripts/stage5_archive.py` after Stage 1 collection. It saves separate content-hashed JSON files under `research-ledger/stage5/snapshots/` and an index in `manifest.json`. Each snapshot includes the game key, sport, provider URL, source observation timestamp, scheduled start, phase, and team identifiers. Postgame snapshots require a completed status and both scores. Pregame snapshots intentionally omit scores.

These are **source snapshots**, not real Currentscy Picks model predictions. Stage 5 does not yet extract forecasts from the live website, authenticate source timestamps, independently verify final scores, or improve the live model. Content hashes and exclusive-create files protect against accidental local overwrite; Git repository permissions still allow history or files to be changed, so this is not a tamper-proof archive.

The existing Stage 3/4 audits still require pregame prediction exports and independently verified outcomes. Their deployment gates remain closed. The source endpoint is unofficial ESPN and must be independently verified for completeness and permitted use.

To finish Stage 5: implement a trusted server-side prediction capture service at forecast generation time, link each prediction to a versioned game snapshot, ingest independently confirmed results, use chronological out-of-sample evaluation and a reviewed release/rollback process. No automatic change to website probabilities is enabled.

Test: `python -m unittest discover -s scripts -p 'test_stage5_archive.py'`.
