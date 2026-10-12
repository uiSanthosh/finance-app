import assert from 'node:assert/strict';
import { analyse, maxDrawdown, volatility } from './src/analysis.js';
import { detect, yahooSymbol, nameFromTitle } from './src/detect.js';
import { parseChart, pickSearchResult } from './src/market.js';
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
console.log('all tests passed');
