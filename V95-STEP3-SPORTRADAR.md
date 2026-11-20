# V95 Step 3 — Sportradar NFL integration foundation

Implemented:
- `scripts/v95_sportradar_private.py`: restricted HTTPS-domain collector that checks authenticated NFL JSON responses and prints only high-level schema keys, never raw licensed records.
- `.github/workflows/v95-sportradar.yml`: manually triggered validation job.
- `v95-sportradar.js`: public-side adapter that reports *unverified* until a licensed server feed is operational.

**Activation requirements:** Obtain a Sportradar NFL subscription and confirm whether your product supports `x-api-key` header authentication. Configure GitHub Actions secret `SPORTRADAR_API_KEY` and repository variable `SPORTRADAR_NFL_FEED_URL` (full HTTPS NFL endpoint without query string). Do not paste credentials into chat or frontend files. Run the workflow manually and inspect its schema-only output. If your contracted endpoint requires query-string authentication, modify the private server adapter appropriately without logging or publishing credentials.

**Not implemented or verified:** actual subscription request, game/player field mapping, player-to-defender assignment, live injury status, permission for public/commercial derivative analytics, correlation or calibration, and integration with NFL picks. The workflow does not upload or commit licensed records. Existing public main branch is unchanged.
