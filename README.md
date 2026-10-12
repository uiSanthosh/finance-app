# Finance App

A Chrome extension that gives a beginner a plain-English view of the stock or ETF they are looking at (India NSE/BSE and US).
Education only, not personal investment advice. Plan: [docs/PLAN.md](docs/PLAN.md).

## v0.2 (build step 1): dock and panel
- A floating dock appears on Google Finance, Yahoo Finance, Groww, TradingView and Zerodha pages.
- The analyse button opens a panel for the stock on the page (auto-detected), with live price in its own currency, a 1M/3M/6M/All price chart with hover, and highest/average/lowest price for the range.
- Pages where the stock cannot be detected (e.g. Zerodha Kite) get a search box in the panel.
- The heart adds the stock to a wishlist synced through your Chrome login.
- Clicking the extension's toolbar icon shows or hides the dock.
- Bell (alerts), key metrics, the Good time gauge and settings come in the next steps.

## Try it
1. `chrome://extensions` -> turn on Developer mode -> Load unpacked -> choose this folder.
2. Open e.g. `https://www.google.com/finance/quote/RELIANCE:NSE` or `https://finance.yahoo.com/quote/AAPL/`.
3. Click the green bar-chart button on the dock.

Run the logic tests: `node test.mjs`
