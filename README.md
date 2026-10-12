# Finance App

A Chrome extension that gives a beginner a plain-English view of the stock or ETF they are looking at (India NSE/BSE and US).
Education only, not personal investment advice. Plan: [docs/PLAN.md](docs/PLAN.md).

## v0.3: dock, panel, Good time gauge, key metrics, price alerts
- A floating dock appears on Google Finance, Yahoo Finance, Groww, TradingView and Zerodha pages.
- The analyse button opens a panel for the stock on the page (auto-detected), with live price in its own currency, a 1M/3M/6M/All price chart with hover, and highest/average/lowest price for the range.
- Works on Google Finance, Yahoo Finance (all regions), Groww, TradingView, Tickertape, Upstox, Angel One, Screener, NSE, BSE, Economic Times, Moneycontrol, MarketWatch, Nasdaq, Investing.com, StockAnalysis, Finviz, Seeking Alpha, CNBC and Zerodha. Pages with an unknown layout fall back to the stock name in the page title.
- The heart adds the stock to a wishlist synced through your Chrome login.
- Clicking the extension's toolbar icon shows or hides the dock.
- **Should you buy this now?** A Good time / Wait / Bad time gauge for 1 month, 6 months or 1+ year, with reasons and a confidence score.
- **Price drop alert:** set a target price; a Chrome notification fires when it is reached (checked every 15 minutes while Chrome is open). The bell lists your alerts.
- **Key metrics:** 5 for stocks, up to 3 for ETFs, each with a green/amber/red dot and a plain sentence. Hover the info icon for what it means.
- **Settings (gear):** your risk comfort level.

## Try it
1. `chrome://extensions` -> turn on Developer mode -> Load unpacked -> choose this folder.
2. Open e.g. `https://www.google.com/finance/quote/RELIANCE:NSE` or `https://finance.yahoo.com/quote/AAPL/`.
3. Click the green bar-chart button on the dock.

Run the logic tests: `node test.mjs`
