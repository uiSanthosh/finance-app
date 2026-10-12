# Roadmap

Decisions (from Sandy): Chrome extension, India + US, stocks + ETFs, free data, AI explanations with a confidence score, just for Sandy, builder walks through the code.

## v0.1 (this commit): price-based report card
Trend, momentum, risk and price level from 1y of daily prices. Rules-based, easy to read in `src/analysis.js`.

## v0.2: what an analyst checks about the business
- Stocks: revenue/profit growth, margins, debt, return on equity, P/E vs sector, dividend.
- ETFs: expense ratio, tracking difference, top holdings, size.
- Needs a free fundamentals source (Yahoo quoteSummary needs a cookie/crumb; alternatives to evaluate).

## v0.3: guidance
- Watchlist, a "learn" glossary, position-size and diversification hints, a plain risk quiz to set the risk level.

## Guardrails
- Output is a research summary and questions to check, not "buy this". Indian law restricts personalised buy/sell advice to SEBI-registered advisers.
- Yahoo's endpoint is unofficial and may change or rate-limit.
