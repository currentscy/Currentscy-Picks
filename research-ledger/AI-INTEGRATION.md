# Currentscy Picks AI Research Integration

## Installed in this update

- `scripts/ai-research-agent.py`: server-side AI research analyst, strictly limited to saved pregame forecasts, verified outcomes, Stage 3 scoring, and shadow-calibration reports. It uses the OpenAI Responses API only when the repository's **GitHub Actions secret** `OPENAI_API_KEY` is configured. Without the secret it publishes a deterministic evidence report, with `status=awaiting-server-api-key`.
- `v-ai-research.js`: read-only website panel showing scored games, pending finals, and AI research notes when available. It does not expose any secret to the browser.
- `.github/workflows/live-feedback.yml`: runs the agent with the NBA collection workflow every 15 minutes and on eligible pushes/manual dispatch.
- `.github/workflows/stage1-collection.yml`: runs the same agent with multisport collection.
- `scripts/test_ai_research_agent.py`: checks forecast time gates and result provenance.

## Required one-time authorization (cannot be performed by repository file edits)

Open **GitHub > currentscy/Currentscy-Picks > Settings > Secrets and variables > Actions > New repository secret**. Set name **`OPENAI_API_KEY`** and paste a valid OpenAI API key there. Never put the key in HTML, JavaScript, Git commits, chat messages, or public JSON. An API account with available billing/credits is required. The scheduled workflow will automatically use the secret; no website hosting migration is required.

Optional `OPENAI_MODEL` is currently set to `gpt-4.1-mini` in the workflow. The Responses API may incur per-call charges. Two workflows run the AI analysis; cap usage and watch API billing.

## Validation

Inspect `research-ledger/ai/latest.json`. `aiEnabled:true` and `status:ai-analysis-complete` are required to confirm an actual model response. `awaiting-server-api-key` means the server-side AI model is **not** connected. `ai-unavailable` means an API call failed.

Check `research-ledger/stage3/evaluation.json` and `research-ledger/learning/report.json` separately for genuine scored outcomes and learning evidence. A successful AI explanation does not establish calibration accuracy or trigger a model release.

The AI does **not** autonomously change source code, release probabilities, ingest live injuries/lineups, or replace the existing simulation engines. Those would require additional verified connectors and a controlled deployment/review process.
