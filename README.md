# PolyEdge Scanner

PolyEdge Scanner is a React-based Polymarket intelligence dashboard that pairs a mock market feed with an ensemble AI oracle. It highlights high-confidence YES/NO edges, visualizes price action, and surfaces whale/watchlist insights through a tabbed UI.

## What it does
- **Live scanner UI**: Renders top conviction markets with price, reward/risk, funding, liquidity, and recent whale/copy activity, including mini sparkline charts.
- **Edge scoring**: Applies rule-based analysis on each market (funding, whale clusters, liquidity squeezes, copy-trader surges) to derive a 1–10 score and recommended direction (YES/NO/SHADOW_WHALE) that drives the badge and tags shown in the cards.
- **AI oracle modal**: Asks the ensemble PolyEdge Oracle for a structured verdict (direction, conviction, confidence, targets, reasoning) and displays it in a modal alongside the dashboard results.
- **Whale leaderboard**: Lists mocked whale traders with PnL and win-rate progress bars, letting users open an AI-generated whale profile from the same Gemini client used for secondary prompts.
- **Bankr copy execution**: Copy buttons now route through a Bankr Bot hook when `BANKR_API_KEY` is provided, enabling one-click social/agentic execution (with a clear fallback when not configured).
- **Tabs and settings**: Includes watchlist and configuration panels (simulation toggle, liquidity thresholds) to frame future real-data integration.

## How it works (high level)
1. **Mock market generation**: `generateMockMarkets()` seeds five representative markets with prices, funding, liquidity, whale counts, copy-trader counts, and price history for charting.
2. **Edge analysis engine**: `analyzeMarket()` scores each market by combining price thresholds, funding bias, whale clusters, liquidity squeezes, and copy-trader density. It outputs direction, tags, and a reward/risk ratio used by the UI.
3. **Ensemble AI oracle**: `askPolyEdgeOracle()` calls both Anthropic Claude 3.5 Sonnet and Gemini 2.5 Flash (JSON mode), parses their structured responses, votes on direction, averages score, and sets conviction and confidence before returning the final verdict.
4. **Dashboard data flow**: `refreshData()` regenerates markets, runs `analyzeMarket()` per market, sorts the top edges (score ≥ 7), and renders them in responsive cards with badge tags and charts. Oracle and whale-profile modals reuse the Gemini client for structured replies.

## Running locally
```bash
npm install
npm run start
```

### Environment variables
- `GEMINI_API_KEY` – enables Gemini prompts (whale profiles + fallback oracle text)
- `ANTHROPIC_API_KEY` – enables Claude in the ensemble oracle
- `BANKR_API_KEY` – enables Bankr Bot execution for copy trades

## What’s next
- Replace `generateMockMarkets()` with live Polymarket data (Gamma API + The Graph) and wire real whale counts via Dune to remove placeholders.
- Persist AI verdict history and whale profiles (Supabase/Redis) so the oracle can reason over past trades.
- Add ensemble expansion (e.g., Grok/xAI) and self-critique loops, then surface confidence deltas in the UI.
- Build production deploy to Vercel with environment variables for `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`.
