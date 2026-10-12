// Works out which stock or ETF a finance page is showing. Pure functions, no browser APIs.
// Returns { symbol } when the page names the symbol, { query, prefer } when only a name is known
// (resolved later through a search), or null.

const US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'NYSEARCA', 'NYSEAMERICAN', 'AMEX', 'BATS']);
const INDIA_HOSTS = ['groww.in', 'tickertape.in', 'upstox.com', 'angelone.in', 'economictimes.indiatimes.com', 'moneycontrol.com',
  'screener.in', 'nseindia.com', 'bseindia.com', 'zerodha.com', 'indmoney.com', 'in.tradingview.com', 'in.investing.com', 'in.finance.yahoo.com'];

export function yahooSymbol(exchange, ticker) {
  const ex = exchange.toUpperCase();
  const t = ticker.toUpperCase();
  if (ex === 'NSE') return `${t}.NS`;
  if (ex === 'BSE') return `${t}.BO`;
  if (US_EXCHANGES.has(ex)) return t.replace('.', '-');
  return null;
}

// "Reliance Industries Ltd (RELIANCE) Share Price Today - Live | Site" -> "Reliance Industries Ltd"
export function nameFromTitle(title) {
  const first = (title || '').split(/\s[|\-–—]\s|\s:\s/)[0];
  const cleaned = first
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(share|stock)s?\s*price\b|\b(live|today|updates?|quote|chart|charts|news|stock|share)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}&.' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 ? cleaned : null;
}

// Sites with their own URL rules above: if the URL is not a stock page there, do not guess from the title.
const RULED = ['finance.yahoo.com', 'tradingview.com', 'screener.in', 'nseindia.com', 'bseindia.com', 'marketwatch.com', 'nasdaq.com',
  'stockanalysis.com', 'finviz.com', 'seekingalpha.com', 'cnbc.com', 'groww.in', 'tickertape.in', 'upstox.com', 'angelone.in',
  'economictimes.indiatimes.com', 'investing.com', 'indmoney.com'];

const fromSlug = (slug) => slug.replace(/-share-price$/i, '').replace(/-/g, ' ').trim();

export function detect(urlString, title = '') {
  let url;
  try { url = new URL(urlString); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const path = decodeURIComponent(url.pathname);
  const is = (domain) => host === domain || host.endsWith(`.${domain}`);
  const prefer = INDIA_HOSTS.some(is) || /\.in$/.test(host) ? 'IN' : 'US';
  const sym = (s) => (s ? { symbol: s } : null);
  let m;

  if (/^google\.[a-z.]+$/.test(host)) {
    return (m = path.match(/^\/finance\/quote\/([^/:]+):([A-Za-z]+)/)) ? sym(yahooSymbol(m[2], m[1])) : null;
  }
  if (is('finance.yahoo.com')) {
    return (m = path.match(/^\/quote\/([^/]+)/)) ? { symbol: m[1].toUpperCase() } : null;
  }
  if (is('tradingview.com')) {
    if ((m = path.match(/^\/symbols\/([A-Za-z]+)-([^/]+)/))) return sym(yahooSymbol(m[1], m[2]));
    const q = url.searchParams.get('symbol');
    if (q && q.includes(':')) { const [ex, t] = q.split(':'); return sym(yahooSymbol(ex, t)); }
  } else if (is('screener.in')) {
    if ((m = path.match(/^\/company\/([^/]+)/))) return { symbol: /^\d+$/.test(m[1]) ? `${m[1]}.BO` : `${m[1].toUpperCase()}.NS` };
  } else if (is('nseindia.com')) {
    const t = url.searchParams.get('symbol');
    if (t) return { symbol: `${t.toUpperCase()}.NS` };
  } else if (is('bseindia.com')) {
    if ((m = path.match(/\/(\d{6})\/?$/))) return { symbol: `${m[1]}.BO` };
  } else if (is('marketwatch.com')) {
    if ((m = path.match(/^\/investing\/(?:stock|fund)\/([^/]+)/))) return { symbol: m[1].toUpperCase().replace('.', '-') };
  } else if (is('nasdaq.com')) {
    if ((m = path.match(/^\/market-activity\/(?:stocks|etf)\/([^/]+)/))) return { symbol: m[1].toUpperCase().replace('.', '-') };
  } else if (is('stockanalysis.com')) {
    if ((m = path.match(/^\/(?:stocks|etf)\/([^/]+)/))) return { symbol: m[1].toUpperCase().replace('.', '-') };
  } else if (is('finviz.com')) {
    const t = url.searchParams.get('t');
    if (t) return { symbol: t.toUpperCase().replace('.', '-') };
  } else if (is('seekingalpha.com')) {
    if ((m = path.match(/^\/symbol\/([^/]+)/))) return { symbol: m[1].toUpperCase().replace('.', '-') };
  } else if (is('cnbc.com')) {
    if ((m = path.match(/^\/quotes\/([^/]+)/))) return { symbol: m[1].toUpperCase().replace('.', '-') };
  } else if (is('groww.in')) {
    if ((m = path.match(/^\/(stocks|etfs|us-stocks)\/([^/]+)/))) return { query: fromSlug(m[2]), prefer: m[1] === 'us-stocks' ? 'US' : 'IN' };
  } else if (is('indmoney.com')) {
    if ((m = path.match(/^\/us-stocks\/etfs\/([a-z0-9.-]+)\/?$/i))) return { symbol: m[1].toUpperCase().replace('.', '-') };
    if ((m = path.match(/^\/us-stocks\/[^/]*-share-price-([a-z0-9.-]+)\/?$/i))) return { symbol: m[1].toUpperCase().replace('.', '-') };
    if ((m = path.match(/^\/stocks\/([^/]+)/))) return { query: fromSlug(m[1]), prefer: 'IN' };
  } else if (is('tickertape.in') || is('upstox.com') || is('angelone.in')) {
    if ((m = path.match(/^\/(?:stocks|etfs|stock)\/([^/]+)/))) return { query: fromSlug(m[1]), prefer };
  } else if (is('economictimes.indiatimes.com')) {
    if ((m = path.match(/^\/([^/]+)\/stocks\/companyid-/))) return { query: fromSlug(m[1]), prefer };
  } else if (is('investing.com')) {
    if ((m = path.match(/^\/(?:equities|etfs)\/([^/]+)/))) return { query: fromSlug(m[1]), prefer };
  }

  if (RULED.some(is)) return null;
  // Unknown page layout: fall back to the stock name in the page title (shown in the panel so a wrong match is easy to spot).
  const query = nameFromTitle(title);
  return query ? { query, prefer, fromTitle: true } : null;
}

// Reads the exchange symbol printed on the page itself (most broker sites show "NSE: RELIANCE",
// "RELIANCE • NSE" or an "NSE Symbol RELIANCE" row). More reliable than searching by company name.
// page: { title, description, text } where text is the start of the page's visible text.
const NOT_TICKERS = new Set(['NSE', 'BSE', 'LIVE', 'SHARE', 'PRICE', 'STOCK', 'STOCKS', 'TODAY', 'INDEX', 'SYMBOL', 'NIFTY', 'SENSEX', 'ETF', 'BUY', 'SELL', 'CODE']);
const isTicker = (t) => /^[A-Z][A-Z0-9&-]{1,19}$/.test(t) && !NOT_TICKERS.has(t);

function scan(re, src) {
  for (const m of src.matchAll(re)) if (isTicker(m[1])) return m[1];
  return null;
}

export function detectFromText(page) {
  const title = page.title || '', desc = page.description || '', text = page.text || '';
  const all = `${title}\n${desc}\n${text}`;
  let t, m;
  if ((m = title.match(/\(([A-Z0-9&-]+\.(?:NS|BO))\)/))) return { symbol: m[1] }; // Yahoo: "(RELIANCE.NS)"
  if ((t = scan(/\bNSE\s*(?:symbol|code)?\s*[:-]?\s*([A-Za-z][A-Za-z0-9&-]{1,19})\b/gi, all))) return { symbol: `${t}.NS` };
  if ((t = scan(/\b([A-Z][A-Z0-9&-]{1,19})\s*[•·|]\s*NSE\b/g, all))) return { symbol: `${t}.NS` };
  if ((m = all.match(/\bBSE\s*(?:code|scrip code)?\s*[:-]?\s*(\d{6})\b/i))) return { symbol: `${m[1]}.BO` };
  if ((m = all.match(/\b(?:NASDAQ|NYSE|NYSEARCA|NYSE ARCA|NYSEAMERICAN|AMEX)\s*:\s*([A-Z]{1,5}(?:\.[A-Z])?)\b/))) return { symbol: m[1].replace('.', '-') };
  // Tickertape style title: "RELIANCE Share Price Today: Reliance Industries NSE"
  if ((m = title.match(/^([A-Z][A-Z0-9&-]{1,19}) Share Price/)) && isTicker(m[1]) && /\bNSE\b/.test(title)) return { symbol: `${m[1]}.NS` };
  return null;
}
