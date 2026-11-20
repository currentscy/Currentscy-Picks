# Currentscy Picks V96 — NFL integration release gate

The development website title and visible version text are normalized to **V96**. Existing sports and simulations remain in place. The NFL source coordinator is `v96-nfl-integrated.js`.

## What is actually wired
- Calls the nflverse historical data reader, which fails closed if the generated JSON has not been produced.
- Calls the ESPN secondary NFL scoreboard reader for game context. Public endpoint access does not confer commercial usage rights.
- Checks SportsDataIO and Sportradar adapters for actual connected/verified status. They remain disconnected until licensed server integrations exist.
- `evaluateInputs()` returns missing evidence; it does not silently substitute fabricated measurements.
- `playerSummary()` permits licensed, authorized, fresh PFF content **only** when context equals `five-leg-player-parlay`. No PFF key, feed, scraped content, or summary is included.
- DOM text-node normalization replaces visible legacy version numbers with V96; it does not rename historical filenames or code symbols.

## What is NOT done
The current five-leg simulation implementation has **not** been replaced by a four-provider joint model. There is no authenticated SportsDataIO or Sportradar account connection, no nflverse collector run confirmed, no verified player-ID mapping, no individual defender assignment data, no licensed PFF summary service, and no out-of-sample calibration. Source health is not equivalent to prediction accuracy. The coordinator provides a fail-closed readiness report, not a new calibrated probability.

## Promotion checklist
1. Run nflverse collector and inspect the generated 2026 player data.
2. Obtain commercial rights and configure private backend credentials for SportsDataIO and Sportradar.
3. Verify IDs, freshness, injury status and metric parity across feeds.
4. Validate any PFF player summary license and server-side delivery restricted to five-leg player summary.
5. Run historical walk-forward and joint-parlay correlation tests, then wire only verified signals into simulation.
6. Test all sports navigation, footer, and deployment before promoting this branch to main.

The public main branch remains unchanged until these checks pass.
