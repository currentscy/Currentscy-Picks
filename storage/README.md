# Prediction storage and reconciliation: implementation contract

Status: **D1 schema committed; NOT deployed or bound to Worker.** No predictions are currently being saved by this schema alone. This is a backend contract, not a replacement for existing Worker JS.

## D1 setup
1. Create Cloudflare D1 database `currentscy-predictions`.
2. Run `storage/predictions-schema.sql` in the D1 SQL console.
3. Bind D1 to the existing Cloudflare Worker as `PREDICTIONS_DB`.
4. Integrate an authenticated server-side snapshot route into the **complete existing Worker** without removing its soccer/UFC/CFBD routes. Do not publish a public unauthenticated write route.
5. Add a scheduled server-side pre-kickoff prediction job using the same deterministic model and frozen input snapshot. A browser-only implementation is not automatic when nobody visits.
6. Save both model outputs in a single immutable snapshot row. The server assigns recorded_at_utc; refuse snapshots at/after kickoff. Use UTC ISO timestamps, stable ESPN event/player IDs, exact threshold and market, and provenance. Never update a prediction after saving.
7. After final, fetch ESPN game summary and extract player statistics by athlete ID and team; only save supported markets after matching game/player/stat and checking completeness. Unmatched outcomes stay pending.
8. Calculate paired Brier scores and projection errors; group holdouts by game and compare league by league. Never promote the coaching model solely from one-game improvements.

## Interpretation
A snapshot's source_payload_hash must hash the frozen inputs; a claimed timestamp is not proof of pregame creation unless the backend actually received and persisted it before kickoff. D1 CHECK on timestamps assumes canonical fixed-width UTC ISO 8601 strings; enforce timestamp parsing in Worker as well.

ESPN box scores do not provide reliable per-snap man/zone assignments, cornerback shadow coverage or causal coaching adjustments. Treat such inputs as unknown unless a separately verified charting provider supplies them.

## Required tests before enabling
- Reject missing auth, invalid league, probabilities outside [0,1], mismatched player/game and after-kickoff writes.
- Prevent duplicates and all post-hoc prediction edits.
- Validate ESPN stat extraction against several real completed NFL and NCAA games; missing player rows must not mean zero.
- Confirm scheduler runs without an open browser, and record scheduler failures.
- Ensure website pages and all other Worker endpoints still function.

No API secrets belong in this repository. No automatic coaching model activation until held-out evaluation is reviewed.
