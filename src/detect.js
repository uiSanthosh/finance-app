// Works out which stock or ETF a finance page is showing. Pure functions, no browser APIs.
// Returns { symbol } when the page names the symbol, { query, prefer } when only a name is known
// (resolved later through a search), or null.

const US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'NYSEARCA', 'NYSEAMERICAN', 'AMEX', 'BATS']);

export function yahooSymbol(exchange, ticker) {
  const ex = exchange.toUpperCase();
  const t = ticker.toUpperCase();
  if (ex === 'NSE') return `${t}.NS`;
  if (ex === 'BSE') return `${t}.BO`;
  if (US_EXCHANGES.has(ex)) return t.replace('.', '-');
  return null;
}

export function detect(urlString) {
  let url;
  try { url = new URL(urlString); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '');
  const path = decodeURIComponent(url.pathname);

  if (host === 'google.com') {
    const m = path.match(/^\/finance\/quote\/([^/:]+):([A-Za-z]+)/);
    const symbol = m && yahooSymbol(m[2], m[1]);
    return symbol ? { symbol } : null;
  }
  if (host === 'finance.yahoo.com') {
    const m = path.match(/^\/quote\/([^/]+)/);
    return m ? { symbol: m[1].toUpperCase() } : null;
  }
  if (host === 'tradingview.com') {
    const m = path.match(/^\/symbols\/([A-Za-z]+)-([^/]+)/);
    const symbol = m && yahooSymbol(m[1], m[2]);
    return symbol ? { symbol } : null;
  }
  if (host === 'groww.in') {
    const m = path.match(/^\/(stocks|etfs|us-stocks)\/([^/]+)/);
    if (!m) return null;
    const query = m[2].replace(/-/g, ' ').trim();
    return { query, prefer: m[1] === 'us-stocks' ? 'US' : 'IN' };
  }
  return null; // Zerodha and others: no reliable signal in the URL, the panel offers search instead
}
