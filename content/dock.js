// The floating dock and stock panel, drawn inside a shadow root so page styles cannot break it.
import { detect } from '../src/detect.js';
import { money, sliceRange, rangeStats, dayChange, chartGeometry, RANGES } from '../src/format.js';
import { analyse, PROFILES } from '../src/analysis.js';
import { HORIZONS, goodTime, gaugeGeometry } from '../src/gauge.js';
import { validateTarget, suggestTarget } from '../src/alerts.js';

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
.panel { position: fixed; top: 20px; right: 84px; z-index: 2147483647; width: 400px; max-height: calc(100vh - 40px); overflow: auto;
  background: #fff; color: #1c1c28; border-radius: 14px; box-shadow: 0 8px 36px rgba(20,20,60,.28); padding: 16px; font-size: 13px; line-height: 1.45; }
.panel[hidden], .dock[hidden] { display: none; }
h2 { margin: 0; font-size: 18px; } h3 { margin: 18px 0 8px; font-size: 14px; }
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
.box { background: #f6f7fb; border-radius: 10px; padding: 10px; }
.hint { color: #666; font-size: 11px; margin: 6px 0 0; }
.gauge { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.gauge svg { flex: none; width: 160px; height: 96px; }
.verdict { font-size: 20px; font-weight: 700; margin: 2px 0; }
.good { color: #15803d; } .wait { color: #b45309; } .bad { color: #dc2626; }
.why { margin: 6px 0 0; padding: 0; list-style: none; font-size: 12px; }
.why li { margin: 3px 0; padding-left: 16px; position: relative; }
.why li::before { position: absolute; left: 0; }
.why.pos li::before { content: '\\2713'; color: #15803d; } .why.neg li::before { content: '!'; color: #dc2626; font-weight: 700; }
.alert { display: flex; gap: 6px; background: #fff; border: 1px solid #dde0ea; border-radius: 8px; padding: 6px; }
.alert input { flex: 1; min-width: 0; border: 0; outline: 0; font: inherit; font-size: 15px; padding: 4px 6px; }
.primary { border: 0; border-radius: 6px; background: #4f46e5; color: #fff; padding: 7px 12px; cursor: pointer; font: inherit; font-weight: 600; }
.link { border: 0; background: none; color: #4338ca; cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.metric { background: #f6f7fb; border-radius: 8px; padding: 8px; }
.metric small { color: #555; font-size: 11px; cursor: help; } .metric b { display: block; font-size: 16px; margin: 1px 0; }
.metric span { font-size: 11px; color: #555; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.dot.good { background: #22a34a; } .dot.ok { background: #f59e0b; } .dot.bad { background: #ef4444; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid #eee; }
.opt { display: block; margin: 8px 0; }
.foot { margin-top: 14px; color: #777; font-size: 11px; }
.msg { padding: 24px 4px; text-align: center; color: #444; }
.toast { position: fixed; top: 24px; right: 84px; z-index: 2147483647; background: #1f1e55; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px; }
`;

const send = (msg) => new Promise((resolve, reject) =>
  chrome.runtime.sendMessage(msg, (res) => {
    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
    res?.ok ? resolve(res.data) : reject(new Error(res?.error || 'No response from the extension.'));
  }));

const store = {
  async get(key, fallback) {
    try { const v = (await chrome.storage.sync.get(key))[key]; return v === undefined ? fallback : v; } catch { return fallback; }
  },
  async set(key, value) {
    try { await chrome.storage.sync.set({ [key]: value }); return true; } catch { return false; }
  },
};

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
  const panel = $('panel');
  const state = {
    symbol: null, data: null, report: null, range: '3M', horizon: '1M', risk: 'medium',
    fund: { status: 'idle', metrics: [] }, url: location.href, title: document.title, fuzzy: false, view: 'stock',
  };

  const toast = (text) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };
  const footer = () => '<div class="foot">Education only, not personal investment advice.</div>';
  const showMessage = (html) => { state.view = 'message'; panel.hidden = false; panel.innerHTML = `<div class="msg">${html}</div>${footer()}`; };

  async function load(target) {
    panel.hidden = false;
    state.view = 'stock';
    panel.innerHTML = '<div class="msg">Loading...</div>';
    try {
      let symbol = target.symbol;
      if (!symbol) {
        symbol = (await send({ type: 'resolve', query: target.query, prefer: target.prefer })).symbol;
        if (!symbol) return showMessage(`I could not find a stock called "${esc(target.query)}".<br><small>Page title: ${esc(document.title)}</small>`);
      }
      state.symbol = symbol;
      state.fuzzy = !!target.fromTitle;
      state.risk = await store.get('risk', 'medium');
      state.data = await send({ type: 'history', symbol });
      state.report = analyse(state.data.points.slice(-253).map((p) => p.c), state.risk);
      state.fund = { status: 'loading', metrics: [] };
      render();
      loadFundamentals(symbol);
    } catch (err) {
      state.data = null;
      showMessage(esc(err.message));
    }
  }

  async function loadFundamentals(symbol) {
    try {
      const { metrics } = await send({ type: 'fundamentals', symbol, currency: state.data.currency });
      if (state.symbol !== symbol) return;
      state.fund = { status: metrics.length ? 'ok' : 'none', metrics };
    } catch {
      if (state.symbol !== symbol) return;
      state.fund = { status: 'error', metrics: [] };
    }
    if (state.view === 'stock' && !panel.hidden) render();
  }

  function gaugeSection() {
    if (!state.report || state.report.error) return '';
    const gt = goodTime(state.report, state.fund.metrics, state.horizon);
    const geo = gaugeGeometry(gt.score);
    const tone = gt.verdict === 'Good time' ? 'good' : gt.verdict === 'Wait' ? 'wait' : 'bad';
    const note = state.fund.status === 'loading' ? 'Adding company data...'
      : gt.hasCompanyData ? 'Based on price trend and company health.' : 'Based on price history only; company data was not available.';
    return `
      <h3>Should you buy this now?</h3>
      <div class="box">
        <div class="tabs" id="horizons">${Object.entries(HORIZONS).map(([k, h]) =>
          `<button data-h="${k}" class="${k === state.horizon ? 'active' : ''}">${h.label}</button>`).join('')}</div>
        <p class="hint">Pick how long you plan to hold it.</p>
        <div class="gauge">
          <svg viewBox="0 0 160 96">
            ${geo.segments.map((s) => `<path d="${s.d}" fill="none" stroke="${s.color}" stroke-width="${s.width}"/>`).join('')}
            <line x1="${geo.cx}" y1="${geo.cy}" x2="${geo.needle.x.toFixed(1)}" y2="${geo.needle.y.toFixed(1)}" stroke="#2b2a8a" stroke-width="3" stroke-linecap="round"/>
            <circle cx="${geo.cx}" cy="${geo.cy}" r="6" fill="#fff" stroke="#2b2a8a" stroke-width="3"/>
            <text x="14" y="94" font-size="10" fill="#ef4444">0 Bad</text><text x="146" y="94" font-size="10" fill="#2e9b45" text-anchor="end">Good 100</text>
          </svg>
          <div><div class="hint" style="margin:0">Our reading</div>
            <div class="verdict ${tone}">${gt.verdict}</div>
            <div class="hint" style="margin:0">Score ${gt.score}/100 &middot; Confidence ${gt.confidence}/100</div></div>
        </div>
        <p class="hint">${note}</p>
        ${gt.good.length ? `<ul class="why pos">${gt.good.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${gt.watch.length ? `<ul class="why neg">${gt.watch.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }

  async function alertSection() {
    const d = state.data;
    const mine = (await store.get('alerts', [])).filter((a) => a.symbol === state.symbol);
    return `
      <h3>Set price drop alert to buy later</h3>
      <div class="alert"><input id="target" inputmode="decimal" value="${suggestTarget(d.price)}" aria-label="Target price"><button class="primary" id="setalert">Set price alert</button></div>
      <p class="hint">You get a Chrome notification when the price falls to this level. Checked every 15 minutes while Chrome is open.</p>
      ${mine.map((a) => `<div class="row"><span>Alert at ${money(a.target, d.currency)}</span><button class="link" data-rm="${esc(a.id)}">Remove</button></div>`).join('')}`;
  }

  function metricsSection() {
    const f = state.fund;
    let body;
    if (f.status === 'loading') body = '<p class="hint">Loading company data...</p>';
    else if (!f.metrics.length) body = '<p class="hint">Company data is not available for this one, so only price signals are used above.</p>';
    else body = `<div class="metrics">${f.metrics.map((m) => `
      <div class="metric"><small title="${esc(m.help)}">${esc(m.label)} &#9432;</small>
        <b><span class="dot ${m.rating}"></span>${esc(m.value)}</b><span>${esc(m.note)}</span></div>`).join('')}</div>`;
    return `<h3>Key metrics</h3>${body}`;
  }

  async function render() {
    state.view = 'stock';
    const d = state.data;
    const pts = sliceRange(d.points, state.range);
    const g = chartGeometry(pts, 368, 150);
    const s = rangeStats(pts);
    const ch = dayChange(d.points, d.price);
    const dir = ch.amount >= 0 ? 'up' : 'down';
    const sign = ch.amount >= 0 ? '+' : '';
    const color = g.up ? '#16a34a' : '#dc2626';
    const alertHtml = await alertSection();
    if (state.view !== 'stock' || state.data !== d) return; // the user moved on while alerts loaded
    panel.innerHTML = `
      <h2>${esc(d.name)}</h2>
      <div class="sub">${esc(d.exchange)}${d.type ? ' | ' + esc(d.type) : ''} | ${esc(d.symbol)}</div>
      <div class="price">${money(d.price, d.currency)} <span class="${dir}" style="font-size:14px">${sign}${money(Math.abs(ch.amount), d.currency)} (${sign}${(ch.percent * 100).toFixed(2)}%)</span></div>
      ${state.fuzzy ? '<div class="sub">Matched from the page title. Not the right stock? Tell me the page address.</div>' : ''}
      <h3>Price history</h3>
      <div class="tabs" id="ranges">${Object.keys(RANGES).map((k) => `<button data-r="${k}" class="${k === state.range ? 'active' : ''}">${k}</button>`).join('')}</div>
      <div class="chartwrap">
        <svg class="chart" id="chart" viewBox="0 0 368 150" preserveAspectRatio="none">
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
      ${gaugeSection()}
      ${alertHtml}
      ${metricsSection()}
      ${footer()}`;
    panel.querySelectorAll('#ranges button').forEach((b) => b.addEventListener('click', () => { state.range = b.dataset.r; render(); }));
    panel.querySelectorAll('#horizons button').forEach((b) => b.addEventListener('click', () => { state.horizon = b.dataset.h; render(); }));
    panel.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
      await store.set('alerts', (await store.get('alerts', [])).filter((a) => a.id !== b.dataset.rm));
      render();
    }));
    panel.querySelector('#setalert')?.addEventListener('click', setAlert);
    wireChart(pts, g, d.currency);
    refreshHeart();
  }

  async function setAlert() {
    const input = panel.querySelector('#target');
    const v = validateTarget(input.value, state.data.price);
    if (v.error) return toast(v.error);
    const alerts = await store.get('alerts', []);
    alerts.push({ id: `${state.symbol}-${Date.now()}`, symbol: state.symbol, name: state.data.name, target: v.target, currency: state.data.currency });
    if (!(await store.set('alerts', alerts))) return toast('Could not save the alert.');
    toast(`Alert set at ${money(v.target, state.data.currency)}.`);
    render();
  }

  function wireChart(pts, g, currency) {
    const svg = panel.querySelector('#chart'), tip = panel.querySelector('#tip');
    const vl = panel.querySelector('#vl'), dot = panel.querySelector('#dot');
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const i = g.nearest(((e.clientX - r.left) / r.width) * 368);
      const [cx, cy] = g.coords[i];
      vl.setAttribute('x1', cx); vl.setAttribute('x2', cx); vl.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.textContent = `${new Date(pts[i].t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}: ${money(pts[i].c, currency)}`;
      tip.style.left = `${Math.min(Math.max((cx / 368) * r.width - 60, 0), r.width - 150)}px`;
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; vl.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
  }

  // Wishlist, alerts and the risk level sync through the Chrome login.
  async function refreshHeart() {
    const on = !!state.symbol && (await store.get('wishlist', [])).some((w) => w.symbol === state.symbol);
    $('heart').classList.toggle('on', on);
    $('heart').querySelector('path').setAttribute('fill', on ? 'currentColor' : 'none');
  }

  async function showAlerts() {
    state.view = 'alerts';
    panel.hidden = false;
    const alerts = await store.get('alerts', []);
    panel.innerHTML = `<h2>Price alerts</h2>
      ${alerts.length ? alerts.map((a) => `<div class="row"><span><b>${esc(a.name)}</b><br>${esc(a.symbol)}: alert at ${money(a.target, a.currency)}</span><button class="link" data-rm="${esc(a.id)}">Remove</button></div>`).join('')
        : '<p class="hint">No alerts yet. Open a stock, set a target price, and you will be notified when it drops to it.</p>'}
      ${footer()}`;
    panel.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
      await store.set('alerts', alerts.filter((a) => a.id !== b.dataset.rm));
      showAlerts();
    }));
  }

  async function showSettings() {
    state.view = 'settings';
    panel.hidden = false;
    const risk = await store.get('risk', 'medium');
    panel.innerHTML = `<h2>Settings</h2><h3>How much risk are you comfortable with?</h3>
      ${Object.entries(PROFILES).map(([k, p]) => `<label class="opt"><input type="radio" name="risk" value="${k}" ${k === risk ? 'checked' : ''}> ${p.label}</label>`).join('')}
      <p class="hint">This changes how the Risk part of the Good time reading is judged.</p>${footer()}`;
    panel.querySelectorAll('input[name="risk"]').forEach((r) => r.addEventListener('change', async () => {
      await store.set('risk', r.value);
      state.risk = r.value;
      if (state.data) state.report = analyse(state.data.points.slice(-253).map((p) => p.c), state.risk);
      toast('Saved.');
    }));
  }

  $('analyse').addEventListener('click', () => {
    if (!panel.hidden && state.view === 'stock') { panel.hidden = true; return; }
    const found = detect(location.href, document.title);
    if (found) load(found);
    else showMessage(`I could not tell which stock or ETF this page shows. Open a stock's own page and try again.<br><small>Page: ${esc(location.hostname + location.pathname)}</small>`);
  });
  $('bell').addEventListener('click', () => (!panel.hidden && state.view === 'alerts' ? (panel.hidden = true) : showAlerts()));
  $('gear').addEventListener('click', () => (!panel.hidden && state.view === 'settings' ? (panel.hidden = true) : showSettings()));
  $('collapse').addEventListener('click', () => $('dock').classList.toggle('collapsed'));
  $('close').addEventListener('click', () => { $('dock').hidden = true; panel.hidden = true; });
  $('heart').addEventListener('click', async () => {
    if (!state.data) return toast('Open a stock first, then tap the heart.');
    const list = await store.get('wishlist', []);
    const has = list.some((w) => w.symbol === state.symbol);
    const next = has ? list.filter((w) => w.symbol !== state.symbol) : [...list, { symbol: state.symbol, name: state.data.name }];
    if (!(await store.set('wishlist', next))) return toast('Could not save to your wishlist.');
    toast(has ? 'Removed from your wishlist.' : 'Added to your wishlist.');
    refreshHeart();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle-dock') $('dock').hidden = !$('dock').hidden;
  });

  // Finance sites are single-page apps: reload the open panel when the stock in the URL changes.
  setInterval(() => {
    if (location.href === state.url && document.title === state.title) return;
    state.url = location.href;
    state.title = document.title;
    if (panel.hidden || state.view !== 'stock') return;
    const found = detect(location.href, document.title);
    if (found) load(found);
  }, 1000);
}
