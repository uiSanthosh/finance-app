// Turns Yahoo's quoteSummary response into the five stock metrics (four for ETFs) shown to a beginner.
// A metric the data source does not return is left out. Thresholds are starting points, not rules.

const raw = (x) => {
  const v = x && typeof x === 'object' ? x.raw : x;
  return Number.isFinite(v) ? v : null;
};

export function parseSummary(json) {
  const r = json?.quoteSummary?.result?.[0];
  if (!r) return null;
  const type = r.price?.quoteType || '';
  const de = raw(r.financialData?.debtToEquity);
  return {
    kind: type === 'ETF' || type === 'MUTUALFUND' ? 'fund' : 'stock',
    sector: r.assetProfile?.sector || '',
    pe: raw(r.summaryDetail?.trailingPE),
    eps: raw(r.defaultKeyStatistics?.trailingEps),
    pb: raw(r.defaultKeyStatistics?.priceToBook),
    growth: raw(r.financialData?.earningsGrowth),
    roe: raw(r.financialData?.returnOnEquity),
    de: de == null ? null : de / 100, // Yahoo reports 45.2 for 0.452
    margin: raw(r.financialData?.profitMargins),
    expense: raw(r.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio) ?? raw(r.summaryDetail?.annualReportExpenseRatio),
    aum: raw(r.summaryDetail?.totalAssets),
    bid: raw(r.summaryDetail?.bid),
    ask: raw(r.summaryDetail?.ask),
  };
}

const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const pick = (value, goodTest, okTest) => (goodTest(value) ? 'good' : okTest(value) ? 'ok' : 'bad');

function compact(value, currency) {
  if (currency === 'INR') return `₹${Math.round(value / 1e7).toLocaleString('en-IN')} Cr`;
  const sym = currency === 'USD' ? '$' : '';
  if (value >= 1e9) return `${sym}${(value / 1e9).toFixed(1)}B`;
  return `${sym}${Math.round(value / 1e6)}M`;
}

export function buildMetrics(p, currency = '') {
  if (!p) return [];
  const out = [];
  const add = (key, label, value, rating, note, help) => out.push({ key, label, value, rating, note, help });

  if (p.kind === 'stock') {
    if (p.pe != null && p.pe > 0) {
      const r = pick(p.pe, (v) => v < 15, (v) => v <= 30);
      add('pe', 'P/E', p.pe.toFixed(1), r,
        { good: 'Cheap for the profit it earns.', ok: 'Priced fairly for its profit.', bad: 'Expensive for the profit it earns.' }[r],
        'Price divided by yearly profit per share. Lower means you pay less for each rupee or dollar of profit.');
    } else if (p.eps != null && p.eps <= 0) {
      add('pe', 'P/E', 'n/a', 'bad', 'The company is losing money, so there is no P/E.', 'Price divided by yearly profit per share.');
    }
    if (p.growth != null) {
      const r = pick(p.growth, (v) => v >= 0.10, (v) => v >= 0);
      add('growth', 'Earnings growth', pct(p.growth), r,
        { good: 'Profit is growing well.', ok: 'Profit is flat to slightly up.', bad: 'Profit is shrinking.' }[r],
        'How much profit grew compared with the same period a year ago.');
    }
    if (p.roe != null) {
      const r = pick(p.roe, (v) => v >= 0.15, (v) => v >= 0.08);
      add('roe', 'ROE', pct(p.roe), r,
        { good: 'Uses shareholders\' money very well.', ok: 'Uses shareholders\' money reasonably.', bad: 'Weak return on shareholders\' money.' }[r],
        'Return on equity: yearly profit as a share of the money shareholders put in. About 15% or more is good.');
    }
    if (p.sector === 'Financial Services' && p.pb != null) {
      const r = pick(p.pb, (v) => v < 2, (v) => v <= 3.5);
      add('pb', 'Price to book', p.pb.toFixed(2), r,
        { good: 'Priced low against its assets.', ok: 'Priced fairly against its assets.', bad: 'Priced high against its assets.' }[r],
        'Price compared with the net worth on the books. Used instead of debt for banks, since borrowing is their business.');
    } else if (p.de != null) {
      const r = pick(p.de, (v) => v < 0.5, (v) => v <= 1.5);
      add('de', 'Debt to equity', p.de.toFixed(2), r,
        { good: 'Little debt.', ok: 'A moderate amount of debt.', bad: 'Heavy debt, which adds risk.' }[r],
        'How much the company has borrowed for every rupee or dollar of its own money. Lower is safer.');
    }
    if (p.margin != null) {
      const r = pick(p.margin, (v) => v >= 0.15, (v) => v >= 0.05);
      add('margin', 'Profit margin', pct(p.margin), r,
        { good: 'Keeps a healthy share of each sale.', ok: 'Keeps a modest share of each sale.', bad: 'Keeps very little of each sale.' }[r],
        'The share of sales left as profit after all costs.');
    }
  } else {
    if (p.expense != null) {
      const r = pick(p.expense, (v) => v <= 0.002, (v) => v <= 0.005);
      add('expense', 'Expense ratio', pct(p.expense, 2), r,
        { good: 'Cheap to hold.', ok: 'Average cost to hold.', bad: 'Expensive to hold.' }[r],
        'The yearly fee, taken from your money. Lower is better.');
    }
    if (p.aum != null) {
      const [g, o] = currency === 'INR' ? [5e9, 5e8] : [1e9, 1e8];
      const r = pick(p.aum, (v) => v >= g, (v) => v >= o);
      add('aum', 'Fund size', compact(p.aum, currency), r,
        { good: 'Large, so easy to buy and sell.', ok: 'Medium sized.', bad: 'Small funds can be hard to trade or may close.' }[r],
        'Total money in the fund (assets under management).');
    }
    if (p.bid > 0 && p.ask > 0) {
      const spread = (p.ask - p.bid) / ((p.ask + p.bid) / 2);
      const r = pick(spread, (v) => v < 0.001, (v) => v < 0.003);
      add('spread', 'Bid-ask spread', pct(spread, 2), r,
        { good: 'Cheap to trade.', ok: 'Fairly cheap to trade.', bad: 'Costly to trade.' }[r],
        'The gap between the price buyers offer and sellers ask. A narrow gap means a fair price when you trade.');
    }
  }
  return out;
}
