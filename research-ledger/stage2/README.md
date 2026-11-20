# Stage 2 — Evidence linking and cross-source reconciliation

Stage 2 runs after Stage 1 in the scheduled GitHub workflow. It reads `research-ledger/stage1/latest.json`, creates stable provider-qualified team IDs (`sport:espn:teamId`), preserves game IDs and source timestamps, and writes `research-ledger/stage2/latest.json`.

**Current operational scope:** Stage 1 supplies ESPN scoreboard records only. Other sources are **not automatically connected**. Optional authorized provider observations may be placed in `research-ledger/stage2/provider-observations.json` as a JSON array. Each observation needs a source URL, provider, event ID, event key, kind, entity ID, effective time, observed time, and verification provenance. Non-ESPN observations require an explicitly evidenced crosswalk to the ESPN event ID; names alone never establish identity. The supplied verified flags and crosswalks are assertions, not independent authentication.

Supported observation kinds: `injury`, `lineup`, `player-stat`, `game-status`. Conflicting observations are retained and marked unresolved. Unknown or incomplete evidence is rejected, not filled with invented information.

**All linked observations are marked `modelEligible: false`.** This stage does not update predictions. Before model integration, add a trusted provider registry, independent verification, timestamp leakage controls, persistent versioned evidence, and calibration testing. The current Stage 1 and Stage 2 outputs are mutable latest snapshots, not a historical truth store. No patient/private information or API secrets should be committed.

Test command: `python -m unittest discover -s scripts -p 'test_stage2_reconcile.py'`. The workflow runs both Stage 1 and Stage 2 tests, then collects and reconciles.
