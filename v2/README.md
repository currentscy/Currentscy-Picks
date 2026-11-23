# Currentscy Picks V2 — integration foundation

This is a non-destructive scaffold for all 10 phases. It is NOT a completed collector, reconciliation service, simulator, or scheduled workflow. Production `index.html`, existing Workers, keys, archived forecasts and workflows remain unchanged by these files.

## Contract
`core/evidence.js` validates a sport/event/season pair, home and away team IDs, and source-linked player statistics from both teams. Each player record must include `playerId`, `teamId`, `season`, `sourceUrl` (HTTPS), `collectedAt` (ISO timestamp), and `stats` (object). Include `gameId` to identify the completed game supporting the observation. Missing injuries/lineups must be explicit rather than invented.

`core/pipeline.js` runs injected collection and persistence adapters, writes readiness diagnostics, and blocks evidence-incomplete events from the next stage. It does not promote a forecast as calibrated.

`core/adapters.js` accepts existing configured HTTPS Worker URLs. It does not discover endpoints, modify Workers, or contain secrets.

## Remaining integration work
1. Inventory actual Worker endpoints and response formats.
2. Implement provider-specific NBA collection of both opponents' completed player box scores.
3. Reconcile provider player/team IDs, duplicates, injury/lineup evidence and conflicting observations.
4. Connect scheduled GitHub Actions/Worker persistence to the shared contract.
5. Add sport-specific simulation and calibrated probability gates.
6. Connect the V2 UI to verified production records.
7. Add fixtures, tests, observability and acceptance checks for all eight sports.

A ready result means basic two-sided player evidence exists, **not** that Phase 1/2 is fully validated. Do not claim the system is autonomous until scheduled collection and end-to-end tests pass.
