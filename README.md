# PolyEdge Scanner

PolyEdge Scanner is a React-based Polymarket intelligence dashboard that pairs live Gamma markets (or simulation mode) with an ensemble AI oracle. It highlights high-confidence YES/NO edges, visualizes price action, and surfaces whale/watchlist insights through a tabbed UI.

## What it does
- **Live scanner UI**: Renders top conviction markets with price, reward/risk, funding, liquidity, and recent whale/copy activity, including mini sparkline charts.
- **Edge scoring**: Applies rule-based analysis on each market (funding, whale clusters, liquidity squeezes, copy-trader surges) to derive a 1–10 score and recommended direction (YES/NO/SHADOW_WHALE) that drives the badge and tags shown in the cards.
- **AI oracle modal**: Asks the ensemble PolyEdge Oracle for a structured verdict (direction, conviction, confidence, targets, reasoning) and displays it in a modal alongside the dashboard results.
- **Whale leaderboard**: Lists mocked whale traders with PnL and win-rate progress bars, letting users open an AI-generated whale profile from the same Gemini client used for secondary prompts.
- **Bankr copy execution**: Copy buttons now route through a Bankr Bot hook when `BANKR_API_KEY` is provided, enabling one-click social/agentic execution (with a clear fallback when not configured).
- **Tabs and settings**: Includes watchlist and configuration panels (simulation toggle, liquidity thresholds) to frame future real-data integration.

## How it works (high level)
1. **Market feed**: `refreshData()` pulls live Polymarket markets from Gamma via `fetchRealMarkets()` when simulation mode is off, and falls back to `generateMockMarkets()` for offline/demo usage.
2. **Edge analysis engine**: `analyzeMarket()` scores each market by combining price thresholds, funding bias, whale clusters, liquidity squeezes, and copy-trader density. It outputs direction, tags, and a reward/risk ratio used by the UI.
3. **Ensemble AI oracle**: `askPolyEdgeOracle()` calls both Anthropic Claude 3.5 Sonnet and Gemini 2.5 Flash (JSON mode), parses their structured responses, votes on direction, averages score, and sets conviction and confidence before returning the final verdict.
4. **Dashboard data flow**: `refreshData()` regenerates markets, runs `analyzeMarket()` per market, sorts the top edges (score ≥ 7), and renders them in responsive cards with badge tags and charts. Oracle and whale-profile modals reuse the Gemini client for structured replies.

## Running locally
```bash
npm install
npm run start
```

### Environment variables
CRA requires client-visible variables to be prefixed. Either prefix with `REACT_APP_` (CRA-native) or `VITE_` (kept for
compatibility with prior examples). The app will read any of the following:

- `REACT_APP_GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`
- `REACT_APP_ANTHROPIC_API_KEY` or `VITE_ANTHROPIC_API_KEY`
- `REACT_APP_BANKR_API_KEY` or `VITE_BANKR_API_KEY`
- `REACT_APP_PRIVY_APP_ID` or `VITE_PRIVY_APP_ID`

Example `.env.local` (Vite-style prefixes work for CRA too because of the resolver):

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GEMINI_API_KEY=AIza...
VITE_BANKR_API_KEY=bankr_...
VITE_PRIVY_APP_ID=cl_...
```

### Launch checklist
1) **Deploy live (≈15s):**
   ```bash
   npm create vercel@latest
   # → Connect repo → Deploy
   ```
   You’ll get a live URL similar to `https://polyedge-scanner-yourname.vercel.app`.
2) **Turn on real data:** In the deployed app open **Settings** and disable **Simulation Mode** to stream Polymarket Gamma markets instantly.
3) **Set environment keys:** Add the Anthropic, Gemini, Bankr, and Privy vars above before building or deploying.

## What’s next
- Swap simulated whale metrics for real Dune/chain traces and persist oracle verdict history (Supabase/Redis) so the AI can reason over past trades.
- Expand the ensemble (e.g., Grok/xAI) and add self-critique loops, surfacing confidence deltas in the UI.
- Wire Privy wallet connect + Polymarket CLOB for native 1-click copy trading as an alternative to Bankr.
