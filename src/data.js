// Free price data from Yahoo Finance's public chart endpoint. No API key needed.
// India: NSE symbols end in .NS (RELIANCE.NS), BSE in .BO. US: plain tickers (AAPL, VOO).

export function toSymbol(input, market) {
  const s = input.trim().toUpperCase();
  if (!s) return '';
  if (s.includes('.') || s.startsWith('^')) return s;
  return market === 'IN' ? `${s}.NS` : s;
}

export async function fetchHistory(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not find "${symbol}" (HTTP ${res.status}). Check the symbol and market.`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(`No data for "${symbol}". Check the symbol and market.`);
  const closes = r.indicators.quote[0].close;
  return {
    symbol,
    name: r.meta.longName || r.meta.shortName || symbol,
    currency: r.meta.currency,
    type: r.meta.instrumentType,
    closes: closes.filter((c) => c != null),
  };
}
