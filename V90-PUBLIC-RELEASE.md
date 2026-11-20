# Currentscy Picks V90 — public website configuration

The public website retains the existing sports sections and V88/V89 development files. The V90 addition is a conservative public NFL data gate, not a PFF integration.

## Public NFL rules
- Never fetch, scrape, embed, or redistribute PFF data.
- Never publish predictions derived from PFF unless an appropriate license is obtained.
- Only admit newly integrated data with explicit public **and** commercial-use authorization, timestamps and provenance.
- A public API endpoint does not by itself establish redistribution or commercial rights.
- The current NFL simulations are not yet integrated with this gate; no new accuracy claim is made.

## Next release checks
1. Verify each provider's terms for commercial display, derivative analytics, caching, and attribution.
2. Wire the public-data gate into NFL matchup calculation paths, with safe fallback when missing.
3. Verify injuries, depth charts, defensive matchups and player identifiers against independent sources.
4. Backtest calibration and check mobile layout.
5. Deploy only after review; keep live V87 untouched until approved.

The new module is loaded in V90 and available at `window.CurrentscyPublicNFL`. It does not override older evaluation logic automatically.
