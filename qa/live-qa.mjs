// Live QA: loads the extension into Playwright's Chromium, opens real finance pages,
// clicks the dock's analyse button and records what the panel shows.
// Setup once: cd qa && npm install && npx playwright install chromium
// Run: node live-qa.mjs            (or: node live-qa.mjs groww   to run only URLs containing "groww")
import { chromium } from 'playwright';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const extension = resolve(here, '..');
const out = join(here, 'out');
mkdirSync(out, { recursive: true });

const PAGES = [
  ['google-reliance', 'https://www.google.com/finance/quote/RELIANCE:NSE', 'RELIANCE.NS'],
  ['google-nvda', 'https://www.google.com/finance/quote/NVDA:NASDAQ', 'NVDA'],
  ['yahoo-reliance', 'https://finance.yahoo.com/quote/RELIANCE.NS/', 'RELIANCE.NS'],
  ['yahoo-aapl', 'https://finance.yahoo.com/quote/AAPL/', 'AAPL'],
  ['yahoo-voo-etf', 'https://finance.yahoo.com/quote/VOO/', 'VOO'],
  ['groww-reliance', 'https://groww.in/stocks/reliance-industries-ltd', 'RELIANCE.NS'],
  ['groww-tcs', 'https://groww.in/stocks/tata-consultancy-services-ltd', 'TCS.NS'],
  ['tickertape-reliance', 'https://www.tickertape.in/stocks/reliance-industries-RELI', 'RELIANCE.NS'],
  ['indmoney-reliance', 'https://www.indmoney.com/stocks/reliance-industries-ltd-share-price', 'RELIANCE.NS'],
  ['indmoney-nvda', 'https://www.indmoney.com/us-stocks/nvidia-corporation-share-price-nvda', 'NVDA'],
  ['indmoney-hyg-etf', 'https://www.indmoney.com/us-stocks/etfs/hyg', 'HYG'],
  ['angelone-reliance', 'https://www.angelone.in/stocks/reliance-industries-ltd', 'RELIANCE.NS'],
  ['tradingview-reliance', 'https://www.tradingview.com/symbols/NSE-RELIANCE/', 'RELIANCE.NS'],
  ['tradingview-aapl', 'https://www.tradingview.com/symbols/NASDAQ-AAPL/', 'AAPL'],
  ['screener-tcs', 'https://www.screener.in/company/TCS/consolidated/', 'TCS.NS'],
  ['moneycontrol-reliance', 'https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI', 'RELIANCE.NS'],
  ['economictimes-reliance', 'https://economictimes.indiatimes.com/reliance-industries-ltd/stocks/companyid-13215.cms', 'RELIANCE.NS'],
  ['upstox-reliance', 'https://upstox.com/stocks/reliance-industries-ltd-share-price/INE002A01018/', 'RELIANCE.NS'],
  ['marketwatch-aapl', 'https://www.marketwatch.com/investing/stock/aapl', 'AAPL'],
  ['nasdaq-aapl', 'https://www.nasdaq.com/market-activity/stocks/aapl', 'AAPL'],
  ['stockanalysis-aapl', 'https://stockanalysis.com/stocks/aapl/', 'AAPL'],
  ['finviz-aapl', 'https://finviz.com/quote.ashx?t=AAPL', 'AAPL'],
  ['cnbc-aapl', 'https://www.cnbc.com/quotes/AAPL', 'AAPL'],
  ['investing-aapl', 'https://www.investing.com/equities/apple-computer-inc', 'AAPL'],
];

const filter = process.argv[2];
const pages = filter ? PAGES.filter(([name, url]) => name.includes(filter) || url.includes(filter)) : PAGES;
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'fa-qa-')), {
  channel: 'chromium',
  headless: process.env.HEADED ? false : true,
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});

const results = [];
for (const [name, url, expected] of pages) {
  const page = await ctx.newPage();
  const r = { name, url, expected, dock: false, symbol: null, ok: false, metrics: 0, verdict: null, note: '' };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);
    r.title = await page.title();
    const analyse = page.locator('#finance-app-root >> #analyse');
    r.dock = (await analyse.count()) > 0;
    if (!r.dock) throw new Error('dock not on page');
    await analyse.click({ timeout: 10000 });
    const panel = page.locator('#finance-app-root >> #panel');
    await page.waitForFunction(() => {
      const p = document.getElementById('finance-app-root')?.shadowRoot?.getElementById('panel');
      return p && !p.hidden && !/Loading\.\.\./.test(p.innerText) && !/Loading company data/.test(p.innerText);
    }, null, { timeout: 40000 }).catch(() => { r.note += 'panel still loading after 40s; '; });
    const text = await panel.innerText();
    r.panel = text.slice(0, 300).replace(/\n+/g, ' | ');
    const sub = text.split('\n').find((l) => / \| /.test(l)) || '';
    r.symbol = sub.split(' | ').at(-1)?.trim() || null;
    r.metrics = await page.locator('#finance-app-root >> .metric').count();
    r.verdict = (await page.locator('#finance-app-root >> .verdict').count()) ? await page.locator('#finance-app-root >> .verdict').innerText() : null;
    r.ok = r.symbol === expected;
    if (!r.ok) r.note += `got ${r.symbol || 'nothing'}; `;
    await panel.screenshot({ path: join(out, `${name}.png`) }).catch(() => {});
  } catch (err) {
    r.note += err.message.split('\n')[0];
    await page.screenshot({ path: join(out, `${name}-page.png`) }).catch(() => {});
  }
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${name}: ${r.symbol || '-'} metrics=${r.metrics} ${r.verdict || ''} ${r.note}`);
  results.push(r);
  await page.close();
}
await ctx.close();

writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
const md = ['| Page | Result | Symbol | Metrics | Reading | Notes |', '| --- | --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.symbol || '-'} | ${r.metrics} | ${r.verdict || '-'} | ${(r.note || '').replace(/\|/g, '/')} |`)];
writeFileSync(join(out, 'report.md'), `${md.join('\n')}\n\n${results.filter((r) => r.ok).length}/${results.length} passed\n`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed. Report: qa/out/report.md`);
