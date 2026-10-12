# Roadmap

Decisions (from Sandy): Chrome extension, India + US, stocks + ETFs, free data, AI explanations with a confidence score, just for Sandy, builder walks through the code.
Full UX plan: "Finance App UX plan" doc in the project.

## Done
- v0.1: price-based scoring (`src/analysis.js`).
- v0.2: dock, panel, stock detection on ~20 finance sites, price chart, wishlist.
- v0.3: key metrics (`src/fundamentals.js`), Good time gauge (`src/gauge.js`), price-drop alerts (`src/alerts.js` + background alarm), risk setting.

## Known differences from the UX plan
- Earnings growth is the latest year-on-year figure, not 3 years (Yahoo no longer serves multi-year statements through the free endpoint).
- P/E is judged on fixed bands, not against the sector average (no free sector averages yet).
- ETF tracking error is not available from the free source, so ETFs show expense ratio, fund size and bid-ask spread when Yahoo returns them. Many Indian ETFs return little data.
- Company data comes from Yahoo's unofficial endpoint, which needs a cookie and crumb and may change.

## Next
- Optional AI explanation of the reading (own Anthropic API key, `src/explain.js`).
- Watchlist view, glossary, earnings-date note, sector-relative P/E.

## Guardrails
- Output is a research reading with reasons, never "buy". Indian law restricts personalised buy/sell advice to SEBI-registered advisers.
