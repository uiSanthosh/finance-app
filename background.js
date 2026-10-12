// Fetches market data for the content script (pages cannot call Yahoo directly because of CORS).
import { pickSearchResult, parseChart } from './src/market.js';

const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const cache = new Map(); // key -> { at, value }
const TTL_MS = 5 * 60 * 1000;

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data source returned HTTP ${res.status}`);
  return res.json();
}

const handlers = {
  history: ({ symbol }) =>
    cached(`h:${symbol}`, async () => parseChart(symbol, await getJson(`${CHART}${encodeURIComponent(symbol)}?range=5y&interval=1d`))),
  resolve: ({ query, prefer }) =>
    cached(`s:${prefer}:${query}`, async () => {
      const json = await getJson(`${SEARCH}?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`);
      return { symbol: pickSearchResult(json.quotes || [], prefer) };
    }),
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = handlers[msg?.type];
  if (!handler) return false;
  handler(msg).then((data) => sendResponse({ ok: true, data }), (err) => sendResponse({ ok: false, error: err.message }));
  return true; // async response
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'toggle-dock' }).catch(() => {});
});
