# V95 Step 1 — nflverse player history

**Implemented:** Python downloader `scripts/v95_nflverse_ingest.py`, GitHub Actions workflow `.github/workflows/v95-nflverse.yml`, and read-only browser adapter `v95-nflverse.js`.

Source: [nflverse player stats release](https://github.com/nflverse/nflverse-data/releases/tag/player_stats). The collector discovers the CSV release asset for the specified season, validates essential columns and minimum record count, then writes `data/v95-nflverse-player-stats.json` atomically. It preserves the five most recent weekly rows per player, provenance and UTC collection timestamp.

**To activate:** Run the GitHub Actions workflow manually for branch `v95-nfl-multisource` with season 2026, or run `NFL_SEASON=2026 python scripts/v95_nflverse_ingest.py` and commit the output. Note: GitHub's scheduled workflows run from the default branch; the schedule in this development branch will **not** run automatically until the workflow is present on the default branch. GitHub Actions may also require repository workflow permissions.

**Not yet verified:** live release asset name/schema, workflow execution, generated JSON, browser fetching, commercial rights for each dataset, and model calibration. A failed download leaves any existing output untouched. No data is invented or bundled as a fake example. The browser reader fails with an explicit error until a successful collector run.

**Not yet connected to picks:** This module exposes historical player values for a future backtest but does not change the existing five-leg research algorithm. No defender coverage, player injuries, PFF data, five-leg joint probabilities, or calibrated estimates are provided. Preserve the live website until the workflow has run and the outputs are inspected.
