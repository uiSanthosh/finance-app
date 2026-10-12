// Turns raw Yahoo Finance responses into the small shapes the panel uses.

export function parseChart(symbol, json) {
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(`No data for "${symbol}".`);
  const close = r.indicators?.quote?.[0]?.close || [];
  const points = [];
  (r.timestamp || []).forEach((t, i) => {
    if (Number.isFinite(close[i])) points.push({ t: t * 1000, c: close[i] });
  });
  if (points.length < 2) throw new Error(`Not enough price history for "${symbol}".`);
  const m = r.meta || {};
  return {
    symbol,
    name: m.longName || m.shortName || symbol,
    exchange: m.fullExchangeName || m.exchangeName || '',
    currency: m.currency || '',
    type: m.instrumentType || '',
    price: Number.isFinite(m.regularMarketPrice) ? m.regularMarketPrice : points.at(-1).c,
    points,
  };
}

// prefer: 'IN' picks NSE then BSE listings, 'US' picks a plain US ticker.
export function pickSearchResult(quotes, prefer) {
  const ok = quotes.filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'));
  const order = prefer === 'US'
    ? [(s) => !s.includes('.')]
    : [(s) => s.endsWith('.NS'), (s) => s.endsWith('.BO')];
  for (const test of order) {
    const hit = ok.find((q) => test(q.symbol));
    if (hit) return hit.symbol;
  }
  return ok[0]?.symbol || null;
}
