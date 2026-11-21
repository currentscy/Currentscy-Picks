# Free AI cross-check setup (no paid OpenAI API)

Installed: `scripts/free-ai-crosscheck.py`, `cloudflare/free-ai-adapter.js`, scheduled workflow steps, and website provider-status panel.

**Important:** All three cannot be accessed without credentials/configuration. The workflows are free-tier-only by design; paid OpenAI calls have been disabled. No AI output is used to overwrite saved forecasts or to claim model accuracy.

- **Cloudflare Workers AI:** Deploy `cloudflare/free-ai-adapter.js` as a Worker in your Cloudflare account. Add a Workers AI binding named `AI`. Add Worker secret `CROSSCHECK_TOKEN` with a long random value. Set GitHub Actions **variable** `CLOUDFLARE_AI_GATEWAY_URL` to that Worker's HTTPS URL and **secret** `CLOUDFLARE_AI_GATEWAY_TOKEN` to the same token. This avoids a separate Cloudflare AI API key, but does require the AI binding and authenticated Worker endpoint. Select a free-eligible model and monitor the daily free allocation. This is a *new optional Worker*, not a replacement for the existing sports-data gateway.
- **Gemini:** Obtain a free-tier Gemini API key in Google AI Studio. Add it to GitHub Actions repository secrets as `GEMINI_API_KEY`. The workflow uses `gemini-2.5-flash-lite` by default; availability and quotas can change. Never commit the key.
- **Groq:** Obtain a GroqCloud developer API key and save it as GitHub Actions secret `GROQ_API_KEY`. Default model `llama-3.1-8b-instant`; free quotas may change.

The GitHub Actions steps call each configured provider independently, writing `research-ledger/ai/cross-check.json` with `ok`, `not-configured`, or `error` statuses. The website reads those statuses. A true three-way cross-check requires `crossCheckComplete:true`, meaning all three actually responded. Agreement is not evidence that any prediction is correct.

When no keys are configured, the existing deterministic data collection, pregame prediction archive, evaluation and shadow calibration continue to operate. No payments are automatically triggered by this integration. Do not configure paid billing or paid models if a strict $0 budget is required.

To confirm actual success, inspect the next scheduled GitHub Actions run and `research-ledger/ai/cross-check.json`. Committed code alone does not prove the three providers have responded.
