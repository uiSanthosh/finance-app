# Finance App

A Chrome extension that gives a beginner a plain-English research report card for stocks and ETFs (India NSE/BSE and US).
Education only, not personal investment advice.

## What v0.1 does
- Type a symbol (e.g. `RELIANCE`, `TCS`, `AAPL`, `VOO`), pick the market and your risk comfort (low / medium / high).
- Gets 1 year of free daily prices from Yahoo Finance (no API key).
- Scores four things 0-100: **Trend**, **Momentum**, **Risk** (vs your comfort level), **Price level**, then an overall score and a **confidence score**.
- Optional: paste your own Anthropic API key in Options for a plain-English AI explanation.

## What v0.1 does not do yet
- No company fundamentals (profits, debt, valuation, ETF costs). That is v0.2 and is the biggest gap versus a real analyst's work.
- Confidence is capped because of this.

## Try it
1. `chrome://extensions` -> turn on Developer mode -> Load unpacked -> choose this folder.
2. Click the extension, enter a symbol, press Research.

Run the logic tests: `node test.mjs`

See [docs/PLAN.md](docs/PLAN.md) for the roadmap.
