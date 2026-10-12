// The floating dock and stock panel, drawn inside a shadow root so page styles cannot break it.
import { detect } from '../src/detect.js';
import { money, sliceRange, rangeStats, dayChange, chartGeometry, RANGES } from '../src/format.js';

const ICONS = {
  chevron: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  chart: '<path d="M5 20V11M12 20V5M19 20v-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  bell: '<path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  gear: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  close: '<path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
};
const icon = (name, fill = 'none') => `<svg viewBox="0 0 24 24" width="22" height="22" fill="${fill}">${ICONS[name]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.dock { position: fixed; top: 80px; right: 12px; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 10px 8px; background: rgba(238,240,246,.92); border-radius: 36px; box-shadow: 0 4px 18px rgba(20,20,60,.18); }
.dock.collapsed .item { display: none; }
.btn { width: 46px; height: 46px; border-radius: 50%; border: 0; background: #1f1e55; color: #fff; display: grid; place-items: center; cursor: pointer; }
.btn:hover { background: #2d2c7a; }
.btn.small { width: 34px; height: 34px; background: #4338ca; }
.btn.on { color: #f43f5e; }
.btn.analyse { color: #4ade80; }
.logo { width: 46px; height: 52px; border-radius: 12px; background: #1f1e55; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 22px; }
.panel { position: fixed; top: 20px; right: 84px; z-index: 2147483647; width: 380px; max-height: calc(100vh - 40px); overflow: auto;
  background: #fff; color: #1c1c28; border-radius: 14px; box-shadow: 0 8px 36px rgba(20,20,60,.28); padding: 16px; font-size: 13px; line-height: 1.45; }
.panel[hidden], .dock[hidden] { display: none; }
h2 { margin: 0; font-size: 18px; } h3 { margin: 16px 0 8px; font-size: 14px; }
.sub { color: #555; margin-top: 2px; }
.price { font-size: 22px; font-weight: 700; margin-top: 8px; }
.up { color: #15803d; } .down { color: #dc2626; }
.tabs { display: flex; gap: 2px; background: #eef0f6; border-radius: 8px; padding: 3px; }
.tabs button { flex: 1; border: 0; background: none; padding: 5px 0; border-radius: 6px; font-size: 12px; cursor: pointer; color: #444; }
.tabs button.active { background: #fff; color: #4338ca; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.chartwrap { position: relative; margin-top: 8px; }
svg.chart { width: 100%; height: 150px; display: block; }
.tip { position: absolute; top: 0; pointer-events: none; background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 2px 6px; font-size: 11px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,.12); }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.card { background: #eff2f9; border-radius: 8px; padding: 8px 6px; text-align: center; }
.card small { display: block; color: #555; font-size: 11px; } .card b { font-size: 14px; }
.soon { background: #f5f6fb; border-radius: 8px; padding: 10px; color: #555; margin-top: 8px; }
.foot { margin-top: 12px; color: #777; font-size: 11px; }
.msg { padding: 24px 4px; text-align: center; color: #444; }
form { display: flex; gap: 6px; margin-top: 10px; }
input { flex: 1; padding: 7px 8px; border: 1px solid #bbb; border-radius: 6px; font: inherit; }
form button { padding: 7px 12px; border: 0; border-radius: 6px; background: #4338ca; color: #fff; cursor: pointer; font: inherit; }
.toast { position: fixed; top: 24px; right: 84px; z-index: 2147483647; background: #1f1e55; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px; }
`;

const send = (msg) => new Promise((resolve, reject) =>
  chrome.runtime.sendMessage(msg, (res) => {
    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
    res?.ok ? resolve(res.data) : reject(new Error(res?.error || 'No response from the extension.'));
  }));

export function start() {
  if (document.getElementById('finance-app-root')) return;
  const host = document.createElement('div');
  host.id = 'finance-app-root';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style>
    <div class="dock" id="dock">
      <button class="btn small" id="collapse" title="Collapse">${icon('chevron')}</button>
      <button class="btn item analyse" id="analyse" title="Analyse this stock">${icon('chart')}</button>
      <button class="btn item" id="bell" title="Price alerts">${icon('bell')}</button>
      <button class="btn item" id="heart" title="Add to wishlist">${icon('heart')}</button>
      <div class="logo item" title="Finance App">F</div>
      <button class="btn small item" id="close" title="Hide on this page">${icon('close')}</button>
      <button class="btn item" id="gear" title="Settings">${icon('gear')}</button>
    </div>
    <div class="panel" id="panel" hidden></div>`;
  const $ = (id) => root.getElementById(id);
  const state = { symbol: null, data: null, range: '3M', url: location.href };

  const toast = (text) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  const panel = $('panel');
  const showMessage = (html) => { panel.hidden = false; panel.innerHTML = `<div class="msg">${html}</div>${searchForm()}${footer()}`; wireSearch(); };
  const footer = () => '<div class="foot">Education only, not personal investment advice.</div>';
  const searchForm = () => '<form id="search"><input id="q" placeholder="Search a stock or ETF, e.g. TCS or VOO" autocomplete="off"><button>Go</button></form>';
  function wireSearch() {
    const form = root.getElementById('search');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = root.getElementById('q').value.trim();
      if (q) load({ query: q, prefer: 'IN' });
    });
  }

  async function load(target) {
    panel.hidden = false;
    panel.innerHTML = '<div class="msg">Loading...</div>';
    try {
      let symbol = target.symbol;
      if (!symbol) {
        symbol = (await send({ type: 'resolve', query: target.query, prefer: target.prefer })).symbol;
        if (!symbol) return showMessage(`Could not find "${esc(target.query)}". Try searching below.`);
      }
      state.symbol = symbol;
      state.data = await send({ type: 'history', symbol });
      render();
    } catch (err) {
      state.data = null;
      showMessage(esc(err.message));
    }
  }

  function render() {
    const d = state.data;
    const pts = sliceRange(d.points, state.range);
    const g = chartGeometry(pts, 348, 150);
    const s = rangeStats(pts);
    const ch = dayChange(d.points, d.price);
    const dir = ch.amount >= 0 ? 'up' : 'down';
    const sign = ch.amount >= 0 ? '+' : '';
    const color = g.up ? '#16a34a' : '#dc2626';
    panel.innerHTML = `
      <h2>${esc(d.name)}</h2>
      <div class="sub">${esc(d.exchange)}${d.type ? ' | ' + esc(d.type) : ''} | ${esc(d.symbol)}</div>
      <div class="price">${money(d.price, d.currency)} <span class="${dir}" style="font-size:14px">${sign}${money(Math.abs(ch.amount), d.currency)} (${sign}${(ch.percent * 100).toFixed(2)}%)</span></div>
      <h3>Price history</h3>
      <div class="tabs">${Object.keys(RANGES).map((k) => `<button data-r="${k}" class="${k === state.range ? 'active' : ''}">${k}</button>`).join('')}</div>
      <div class="chartwrap">
        <svg class="chart" id="chart" viewBox="0 0 348 150" preserveAspectRatio="none">
          <path d="${g.area}" fill="${color}" opacity=".12"/>
          <path d="${g.line}" fill="none" stroke="${color}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
          <line id="vl" y1="0" y2="150" stroke="#999" stroke-dasharray="3" visibility="hidden"/>
          <circle id="dot" r="3.5" fill="${color}" visibility="hidden"/>
        </svg>
        <div class="tip" id="tip" hidden></div>
      </div>
      <div class="cards">
        <div class="card"><small>Highest</small><b>${money(s.high, d.currency)}</b></div>
        <div class="card"><small>Average</small><b>${money(s.average, d.currency)}</b></div>
        <div class="card"><small>Lowest</small><b>${money(s.low, d.currency)}</b></div>
      </div>
      <div class="soon">Next up: the Good time gauge, price-drop alerts and key metrics.</div>
      ${searchForm()}${footer()}`;
    panel.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { state.range = b.dataset.r; render(); }));
    wireChart(pts, g, d.currency);
    wireSearch();
    refreshHeart();
  }

  function wireChart(pts, g, currency) {
    const svg = root.getElementById('chart'), tip = root.getElementById('tip');
    const vl = root.getElementById('vl'), dot = root.getElementById('dot');
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const i = g.nearest(((e.clientX - r.left) / r.width) * 348);
      const [cx, cy] = g.coords[i];
      vl.setAttribute('x1', cx); vl.setAttribute('x2', cx); vl.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.textContent = `${new Date(pts[i].t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}: ${money(pts[i].c, currency)}`;
      tip.style.left = `${Math.min(Math.max((cx / 348) * r.width - 60, 0), r.width - 150)}px`;
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; vl.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
  }

  // Wishlist, synced through the Chrome login.
  const getWishlist = async () => {
    try { return (await chrome.storage.sync.get('wishlist')).wishlist || []; } catch { return []; }
  };
  async function refreshHeart() {
    const on = !!state.symbol && (await getWishlist()).some((w) => w.symbol === state.symbol);
    $('heart').classList.toggle('on', on);
    $('heart').querySelector('path').setAttribute('fill', on ? 'currentColor' : 'none');
  }

  $('analyse').addEventListener('click', () => {
    if (!panel.hidden) { panel.hidden = true; return; }
    const found = detect(location.href);
    if (found) load(found);
    else showMessage('I could not tell which stock this page shows. Search for it below.');
  });
  $('bell').addEventListener('click', () => toast('Price alerts are coming in the next step.'));
  $('gear').addEventListener('click', () => toast('Settings are coming in a later step.'));
  $('collapse').addEventListener('click', () => $('dock').classList.toggle('collapsed'));
  $('close').addEventListener('click', () => { $('dock').hidden = true; panel.hidden = true; });
  $('heart').addEventListener('click', async () => {
    if (!state.data) return toast('Open a stock first, then tap the heart.');
    const list = await getWishlist();
    const has = list.some((w) => w.symbol === state.symbol);
    const next = has ? list.filter((w) => w.symbol !== state.symbol) : [...list, { symbol: state.symbol, name: state.data.name }];
    try { await chrome.storage.sync.set({ wishlist: next }); } catch { return toast('Could not save to your wishlist.'); }
    toast(has ? 'Removed from your wishlist.' : 'Added to your wishlist.');
    refreshHeart();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle-dock') $('dock').hidden = !$('dock').hidden;
  });

  // Finance sites are single-page apps: reload the open panel when the stock in the URL changes.
  setInterval(() => {
    if (location.href === state.url) return;
    state.url = location.href;
    if (panel.hidden) return;
    const found = detect(location.href);
    if (found) load(found);
  }, 1000);
}
