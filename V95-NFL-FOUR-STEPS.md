# V95 NFL multi-source upgrade — four stages

This is a **development branch**, not a verified four-provider live connection.

1. **nflverse** — adapter definition for historical play-by-play and player usage. Data is not fetched by the browser; review commercial rights before public deployment.
2. **SportsDataIO** — subscription-based injuries and active depth charts; credentials must stay in a server-side secret. No account/key configured.
3. **Sportradar** — subscription-based live game, injury, and player data; credentials must stay server-side. No account/key configured.
4. **ESPN** — existing unofficial public feeds remain as secondary sources, not proof of commercial data rights.

New `v95-nfl-sources.js` exposes `window.CurrentscyNFLV95`: a strict normalized-record verifier, source conflict detector, and five-leg readiness check. All records require source URL, timestamp, game/player IDs, public/commercial authorization, and provider identity. Premium feeds also require a server-verification flag.

**Not done:** actual provider subscriptions, backend API endpoints, credential setup, real-world multi-provider joins, individual CB assignments, walk-forward calibration, cross-leg correlation modeling, and production testing. The module does not change existing predictions, display fabricated probabilities, or claim a PFF connection.

Next implementation requires selecting a backend and obtaining commercial licenses. Before deploying any licensed data, confirm the provider's terms for derived predictions and public display. The current public main branch remains unchanged.
