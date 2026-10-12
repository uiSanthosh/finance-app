import assert from 'node:assert/strict';
import { analyse, maxDrawdown, volatility } from './src/analysis.js';
import { detect, yahooSymbol, nameFromTitle, detectFromText } from './src/detect.js';
import { parseChart, pickSearchResult } from './src/market.js';
import { parseSummary, buildMetrics } from './src/fundamentals.js';
import { goodTime, gaugeGeometry, HORIZONS } from './src/gauge.js';
import { validateTarget, suggestTarget, dueAlerts } from './src/alerts.js';
import { money, sliceRange, rangeStats, dayChange, chartGeometry } from './src/format.js';

// analysis (kept for the Good time gauge)
const up = Array.from({ length: 260 }, (_, i) => 100 * 1.001 ** i);
const down = Array.from({ length: 260 }, (_, i) => 100 * 0.998 ** i);
assert.ok(analyse(up).overall > analyse(down).overall);
assert.equal(maxDrawdown([100, 50, 75]), 0.5);
assert.ok(volatility(up) < 1e-9);

// stock detection from page URLs
assert.deepEqual(detect('https://www.google.com/finance/quote/RELIANCE:NSE?window=1Y'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(detect('https://www.google.com/finance/quote/NVDA:NASDAQ'), { symbol: 'NVDA' });
assert.deepEqual(detect('https://www.google.com/finance/quote/BRK.B:NYSE'), { symbol: 'BRK-B' });
assert.equal(detect('https://www.google.com/finance/quote/.INX:INDEXSP'), null);
assert.deepEqual(detect('https://finance.yahoo.com/quote/tcs.ns/'), { symbol: 'TCS.NS' });
assert.deepEqual(detect('https://www.tradingview.com/symbols/NSE-INFY/'), { symbol: 'INFY.NS' });
assert.deepEqual(detect('https://www.tradingview.com/symbols/NASDAQ-AAPL/'), { symbol: 'AAPL' });
assert.deepEqual(detect('https://groww.in/stocks/reliance-industries-ltd'), { query: 'reliance industries ltd', prefer: 'IN' });
assert.deepEqual(detect('https://groww.in/us-stocks/nvda'), { query: 'nvda', prefer: 'US' });
assert.equal(detect('https://kite.zerodha.com/dashboard'), null);
assert.deepEqual(detect('https://in.tradingview.com/symbols/NSE-RELIANCE/'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(detect('https://www.tradingview.com/chart/abc123/?symbol=NASDAQ%3ANVDA'), { symbol: 'NVDA' });
assert.deepEqual(detect('https://in.finance.yahoo.com/quote/INFY.NS/'), { symbol: 'INFY.NS' });
assert.deepEqual(detect('https://www.google.co.in/finance/quote/TCS:NSE'), { symbol: 'TCS.NS' });
assert.deepEqual(detect('https://www.screener.in/company/TCS/consolidated/'), { symbol: 'TCS.NS' });
assert.deepEqual(detect('https://www.screener.in/company/500325/'), { symbol: '500325.BO' });
assert.deepEqual(detect('https://www.nseindia.com/get-quotes/equity?symbol=SBIN'), { symbol: 'SBIN.NS' });
assert.deepEqual(detect('https://www.bseindia.com/stock-share-price/reliance-industries-ltd/reliance/500325/'), { symbol: '500325.BO' });
assert.deepEqual(detect('https://www.marketwatch.com/investing/stock/aapl?mod=search'), { symbol: 'AAPL' });
assert.deepEqual(detect('https://www.nasdaq.com/market-activity/etf/voo'), { symbol: 'VOO' });
assert.deepEqual(detect('https://stockanalysis.com/stocks/msft/'), { symbol: 'MSFT' });
assert.deepEqual(detect('https://finviz.com/quote.ashx?t=TSLA&p=d'), { symbol: 'TSLA' });
assert.deepEqual(detect('https://seekingalpha.com/symbol/AMZN'), { symbol: 'AMZN' });
assert.deepEqual(detect('https://www.cnbc.com/quotes/GOOGL'), { symbol: 'GOOGL' });
assert.deepEqual(detect('https://tickertape.in/stocks/reliance-industries-RELI'), { query: 'reliance industries RELI', prefer: 'IN' });
assert.deepEqual(detect('https://upstox.com/stocks/tata-motors-ltd-share-price/'), { query: 'tata motors ltd', prefer: 'IN' });
assert.deepEqual(detect('https://economictimes.indiatimes.com/hdfc-bank-ltd/stocks/companyid-9195.cms'), { query: 'hdfc bank ltd', prefer: 'IN' });
assert.deepEqual(detect('https://www.investing.com/equities/apple-computer-inc'), { query: 'apple computer inc', prefer: 'US' });
assert.deepEqual(detect('https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI', 'Reliance Industries Share Price Today, Live Stock Price - Moneycontrol'),
  { query: 'Reliance Industries', prefer: 'IN', fromTitle: true });
assert.equal(detect('https://www.moneycontrol.com/', ''), null);
assert.equal(detect('https://groww.in/', 'Groww: Stocks, Mutual Funds'), null);
assert.equal(nameFromTitle('Infosys Ltd (INFY) Stock Price | Site'), 'Infosys Ltd');
assert.equal(nameFromTitle('- '), null);
assert.deepEqual(detect('https://www.indmoney.com/us-stocks/nvidia-corporation-share-price-nvda'), { symbol: 'NVDA' });
assert.deepEqual(detect('https://www.indmoney.com/us-stocks/etfs/hyg'), { symbol: 'HYG' });
assert.deepEqual(detect('https://www.indmoney.com/stocks/reliance-industries-ltd-share-price'), { query: 'reliance industries ltd', prefer: 'IN' });

// symbols printed on the page (titles and text as captured from the live sites on 2026-10-12)
const page = (title, text, description = '') => detectFromText({ title, text, description });
assert.deepEqual(page('Reliance Industries Share Price, Stock Price, LIVE NSE/BSE - Groww', 'Reliance Industries\nRELIANCE •NSE\n₹1,400'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(page('RELIANCE Share Price Today: Reliance Industries NSE', 'RELIANCE Share Price\nNSE\n'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(page('Reliance Industries Ltd Share Price Today – Live NSE/BSE | INDmoney', 'NSE: RELIANCE\nBSE: 500325'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(page('Reliance Share Price - Reliance Industries Stock Price Today NSE/BSE | Angel One', 'RELIANCE\nNSE\nBSE\nAbout\nNSE Symbol\nRELIANCE'), { symbol: 'RELIANCE.NS' });
assert.deepEqual(page('Reliance Industries Limited (RELIANCE.NS) Stock Price, News, Quote & History - Yahoo Finance', ''), { symbol: 'RELIANCE.NS' });
assert.deepEqual(page('NVIDIA Corp', 'NASDAQ: NVDA'), { symbol: 'NVDA' });
assert.deepEqual(page('Company', 'BSE Code: 500325'), { symbol: '500325.BO' });
assert.equal(page('Live NSE/BSE share prices', 'NSE Live\nNSE is open'), null);
assert.equal(detect('not a url'), null);
assert.equal(yahooSymbol('LSE', 'VOD'), null);

// market parsing
const raw = { chart: { result: [{ meta: { longName: 'Test Co', currency: 'INR', fullExchangeName: 'NSE', regularMarketPrice: 105 },
  timestamp: [1, 2, 3, 4], indicators: { quote: [{ close: [100, null, 102, 104] }] } }] } };
const parsed = parseChart('T.NS', raw);
assert.equal(parsed.points.length, 3);
assert.equal(parsed.price, 105);
assert.throws(() => parseChart('X', { chart: { result: null } }));
const quotes = [{ symbol: 'RELIANCE.BO', quoteType: 'EQUITY' }, { symbol: 'RELIANCE.NS', quoteType: 'EQUITY' }, { symbol: 'RELI', quoteType: 'OPTION' }];
assert.equal(pickSearchResult(quotes, 'IN'), 'RELIANCE.NS');
assert.equal(pickSearchResult([{ symbol: 'NVDA', quoteType: 'EQUITY' }, { symbol: 'NVDA.NE', quoteType: 'EQUITY' }], 'US'), 'NVDA');
assert.equal(pickSearchResult([], 'IN'), null);

// formatting and chart geometry
assert.equal(money(1234.5, 'USD'), '$1,234.50');
assert.equal(money(123456.7, 'INR'), '₹1,23,456.70');
const pts = Array.from({ length: 300 }, (_, i) => ({ t: i, c: 100 + i }));
assert.equal(sliceRange(pts, '1M').length, 22);
assert.equal(sliceRange(pts, 'All').length, 300);
const st = rangeStats(sliceRange(pts, '1M'));
assert.ok(st.low === 378 && st.high === 399 && Math.abs(st.average - 388.5) < 1e-9);
const dc = dayChange([{ c: 100 }, { c: 200 }, { c: 209 }], 210);
assert.ok(Math.abs(dc.percent - 0.05) < 1e-9);
const g = chartGeometry([{ c: 1 }, { c: 3 }, { c: 2 }], 100, 50);
assert.ok(g.up && g.line.startsWith('M') && g.nearest(0) === 0 && g.nearest(100) === 2);

// fundamentals: stock
const r = (v) => ({ raw: v });
const summary = (over = {}) => ({ quoteSummary: { result: [{
  price: { quoteType: 'EQUITY' }, assetProfile: { sector: 'Technology' },
  summaryDetail: { trailingPE: r(28.98) }, defaultKeyStatistics: { trailingEps: r(7.91), priceToBook: r(23.78) },
  financialData: { earningsGrowth: r(0.35), returnOnEquity: r(0.4), debtToEquity: r(45.2), profitMargins: r(0.6366) }, ...over }] } });
const ms = buildMetrics(parseSummary(summary()), 'USD');
assert.deepEqual(ms.map((m) => m.key), ['pe', 'growth', 'roe', 'de', 'margin']);
assert.equal(ms.find((m) => m.key === 'pe').rating, 'ok');
assert.equal(ms.find((m) => m.key === 'de').value, '0.45');
assert.equal(ms.find((m) => m.key === 'de').rating, 'good');
assert.equal(ms.find((m) => m.key === 'margin').value, '63.7%');
// banks swap debt to equity for price to book
const bank = buildMetrics(parseSummary(summary({ assetProfile: { sector: 'Financial Services' }, defaultKeyStatistics: { priceToBook: r(1.2) } })), 'INR');
assert.ok(bank.some((m) => m.key === 'pb' && m.rating === 'good') && !bank.some((m) => m.key === 'de'));
// loss-making company, missing data is hidden
const loss = buildMetrics(parseSummary(summary({ summaryDetail: {}, defaultKeyStatistics: { trailingEps: r(-2) }, financialData: {} })), 'USD');
assert.deepEqual(loss.map((m) => [m.key, m.rating]), [['pe', 'bad']]);
// ETF
const etf = buildMetrics(parseSummary({ quoteSummary: { result: [{ price: { quoteType: 'ETF' },
  fundProfile: { feesExpensesInvestment: { annualReportExpenseRatio: r(0.0003) } },
  summaryDetail: { totalAssets: r(4e11), bid: r(400), ask: r(400.1) } }] } }), 'USD');
assert.deepEqual(etf.map((m) => [m.key, m.rating]), [['expense', 'good'], ['aum', 'good'], ['spread', 'good']]);
assert.equal(etf[0].value, '0.03%');
assert.equal(buildMetrics(null).length, 0);

// gauge: price-only vs with company data, by horizon
const rep = analyse(up);
const bad = [{ rating: 'bad', label: 'X', value: '1', note: 'n' }];
const good1 = goodTime(rep, [], '1M');
assert.equal(good1.score, rep.overall);
assert.ok(goodTime(rep, bad, '1Y').score < goodTime(rep, bad, '1M').score, 'company health matters more over a longer hold');
assert.ok(['Good time', 'Wait', 'Bad time'].includes(good1.verdict));
assert.ok(goodTime(rep, bad, '1Y').watch.some((t) => t.startsWith('X 1')));
assert.ok(goodTime(rep, ms, '6M').confidence > good1.confidence);
const geo = gaugeGeometry(100);
assert.equal(geo.segments.length, 5);
assert.ok(geo.needle.x > geo.cx && Math.abs(geo.needle.y - geo.cy) < 1e-6, 'score 100 points right');
assert.ok(gaugeGeometry(0).needle.x < geo.cx);
assert.deepEqual(Object.keys(HORIZONS), ['1M', '6M', '1Y']);

// alerts
assert.deepEqual(validateTarget('2,500', 2900), { target: 2500 });
assert.ok(validateTarget('3000', 2900).error && validateTarget('abc', 10).error && validateTarget('0', 10).error);
assert.equal(suggestTarget(226.58), 215);
const al = [{ id: 'a', symbol: 'X', target: 100 }, { id: 'b', symbol: 'Y', target: 50 }, { id: 'c', symbol: 'Z', target: 5 }];
assert.deepEqual(dueAlerts(al, { X: 99.5, Y: 60 }).map((a) => a.id), ['a']);
console.log('all tests passed');
