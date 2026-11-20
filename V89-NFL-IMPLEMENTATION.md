# Currentscy Picks V89 — NFL public-data architecture

This development branch preserves V88 and introduces an NFL evidence gate. It does **not** fetch, reproduce, scrape, redistribute, or embed PFF data.

## Source priority by question
- Game schedule / scores: ESPN public endpoints, then authorized NFL feed.
- Injuries: official NFL/team reports, then ESPN when authorized and verifiable.
- Individual coverage, defender assignment, pass rush, and pass blocking: only authorized granular sources with event IDs and timestamps.
- PFF: reserved for a future commercial/public license **if approved by PFF**; never a default source.

## Current limitations
The new module `v89-nfl-source-priority.js` exposes `evaluate` and `assessMatchup`, but it is not yet wired into existing NFL simulation outputs. It fails closed, does not infer a defender from position alone, and never fabricates probabilities. Source metadata must include `provider`, `publicUseAuthorized`, `observedAt`, `sourceUrl`, `eventId`, and `value`.

For production: verify provider licensing, terms, endpoint availability, field mappings, caching, and model calibration before connecting this gate to user-facing predictions. Keep credentials on a backend, not in GitHub Pages JavaScript.
