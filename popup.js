import { toSymbol, fetchHistory } from './src/data.js';
import { analyse } from './src/analysis.js';
import { explain } from './src/explain.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = $('out');
  out.textContent = 'Fetching prices...';
  try {
    const info = await fetchHistory(toSymbol($('ticker').value, $('market').value));
    const report = analyse(info.closes, $('risk').value);
    if (report.error) throw new Error(report.error);
    out.innerHTML = `
      <h2>${esc(info.name)} <small>${esc(info.symbol)}</small></h2>
      <div class="score">${report.overall}/100 <span class="verdict">${esc(report.verdict)}</span></div>
      <div>Confidence: <b>${report.confidence}/100</b> (how much to trust this reading) &middot; ${esc(report.profile)}</div>
      ${Object.values(report.pillars).map((p) => `
        <div class="pillar"><b>${esc(p.title)}</b> ${p.score}/100
          <div class="bar"><i style="width:${p.score}%"></i></div>
          <ul>${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}
      <div class="caveat">${report.caveats.map(esc).join('<br>')}</div>
      <div id="ai" class="ai" hidden></div>`;
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (apiKey) {
      const box = $('ai');
      box.hidden = false;
      box.textContent = 'Writing a plain-English explanation...';
      try { box.textContent = await explain(apiKey, info, report); }
      catch (err) { box.textContent = err.message; }
    }
  } catch (err) {
    out.innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
});
