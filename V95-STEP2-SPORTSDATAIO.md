# V95 Step 2 — SportsDataIO private injury-feed validation

Implemented on development branch only:
- `scripts/v95_sportsdataio_private.py` — HTTPS-only, domain-restricted collector with secret header, JSON/schema checks, and no exception-body logging.
- `.github/workflows/v95-sportsdataio.yml` — manually triggered GitHub Action, reads secret `SPORTSDATAIO_API_KEY` and repository variable `SPORTSDATAIO_INJURIES_URL`.
- `v95-sportsdataio.js` — browser adapter explicitly returns *unverified* until a permitted public integration is available.

To test: acquire a SportsDataIO subscription, verify the licensed injury endpoint and its JSON schema against your plan, configure the secret and URL in GitHub repository Actions settings, then manually run the workflow on the development branch. **Do not paste API keys in chat or commit them.**

The runner writes `private-output/sportsdataio-injuries.json` locally for validation, but the workflow does not commit or upload it. Its only public output is the count in the Actions log. For an operational public website, obtain permission for commercial/public use and use a protected backend to generate permitted derived availability flags; never expose subscription keys or unlicensed raw feed in GitHub Pages.

**Not yet done:** live subscription connection, endpoint/schema verification, injuries used by NFL five-leg predictions, historical calibration, and licensing approval. No injury data is fabricated. This step does not affect the live site.
