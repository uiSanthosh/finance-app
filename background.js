// Fetches market data for the content script (pages cannot call Yahoo directly because of CORS)
// and checks price-drop alerts in the background.
import { pickSearchResult, parseChart } from './src/market.js';
import { parseSummary, buildMetrics } from './src/fundamentals.js';
import { dueAlerts } from './src/alerts.js';

const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const SUMMARY = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/';
const MODULES = 'price,summaryDetail,defaultKeyStatistics,financialData,assetProfile,fundProfile';
const cache = new Map(); // key -> { at, value }
const TTL_MS = 5 * 60 * 1000;

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Data source returned HTTP ${res.status}`);
  return res.json();
}

// Yahoo's company data needs a cookie plus a "crumb" token. Fetch them once and reuse.
let crumb = null;
async function getCrumb(force = false) {
  if (crumb && !force) return crumb;
  await fetch('https://fc.yahoo.com', { credentials: 'include' }).catch(() => {}); // sets the cookie; the page itself is a 404
  const res = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { credentials: 'include' });
  if (!res.ok) throw new Error(`Could not get company data access (HTTP ${res.status})`);
  crumb = (await res.text()).trim();
  return crumb;
}

async function fetchSummary(symbol) {
  const url = async (force) => `${SUMMARY}${encodeURIComponent(symbol)}?modules=${MODULES}&crumb=${encodeURIComponent(await getCrumb(force))}`;
  let res = await fetch(await url(false), { credentials: 'include' });
  if (res.status === 401 || res.status === 403) res = await fetch(await url(true), { credentials: 'include' });
  if (!res.ok) throw new Error(`Company data returned HTTP ${res.status}`);
  return res.json();
}

const handlers = {
  history: ({ symbol }) =>
    cached(`h:${symbol}`, async () => parseChart(symbol, await getJson(`${CHART}${encodeURIComponent(symbol)}?range=5y&interval=1d`))),
  resolve: ({ query, prefer }) =>
    cached(`s:${prefer}:${query}`, async () => {
      const qs = `?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
      const json = await getJson(SEARCH + qs).catch(() => getJson(SEARCH.replace('query1', 'query2') + qs));
      return { symbol: pickSearchResult(json.quotes || [], prefer) };
    }),
  fundamentals: ({ symbol, currency }) =>
    cached(`f:${symbol}`, async () => {
      const parsed = parseSummary(await fetchSummary(symbol));
      return { kind: parsed?.kind || 'stock', metrics: buildMetrics(parsed, currency) };
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

// Price-drop alerts: check every 15 minutes while Chrome is open.
const ALARM = 'check-alerts';
function ensureAlarm() {
  chrome.alarms.get(ALARM).then((a) => { if (!a) chrome.alarms.create(ALARM, { periodInMinutes: 15 }); });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm();

async function checkAlerts() {
  const { alerts = [] } = await chrome.storage.sync.get('alerts');
  if (!alerts.length) return;
  const prices = {};
  for (const symbol of new Set(alerts.map((a) => a.symbol))) {
    try {
      const json = await getJson(`${CHART}${encodeURIComponent(symbol)}?range=1d&interval=1d`);
      prices[symbol] = json.chart.result[0].meta.regularMarketPrice;
    } catch { /* try again at the next check */ }
  }
  const due = dueAlerts(alerts, prices);
  if (!due.length) return;
  for (const a of due) {
    chrome.notifications.create(`alert-${a.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Price drop alert: ${a.name}`,
      message: `${a.symbol} is now ${prices[a.symbol].toFixed(2)}, at or below your target of ${a.target}.`,
    });
  }
  const fired = new Set(due.map((a) => a.id));
  await chrome.storage.sync.set({ alerts: alerts.filter((a) => !fired.has(a.id)) });
}
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) checkAlerts(); });
