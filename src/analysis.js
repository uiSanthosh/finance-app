// Pure functions: price history in, beginner-friendly report card out.
// Price-based only in v0.1 (trend, momentum, risk, price level). Fundamentals come in v0.2.

export const PROFILES = {
  low:    { label: 'Low risk',    weights: { trend: 0.25, momentum: 0.10, risk: 0.45, level: 0.20 }, maxVol: 0.20, maxDrawdown: 0.20 },
  medium: { label: 'Medium risk', weights: { trend: 0.30, momentum: 0.20, risk: 0.30, level: 0.20 }, maxVol: 0.30, maxDrawdown: 0.30 },
  high:   { label: 'High risk',   weights: { trend: 0.30, momentum: 0.35, risk: 0.15, level: 0.20 }, maxVol: 0.45, maxDrawdown: 0.45 },
};

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const sma = (a, n) => (a.length >= n ? a.slice(-n).reduce((s, x) => s + x, 0) / n : null);
const pct = (x) => `${(x * 100).toFixed(1)}%`;

export function volatility(closes) {
  if (closes.length < 30) return null;
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  const m = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(252);
}

export function maxDrawdown(closes) {
  let peak = -Infinity, worst = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    worst = Math.min(worst, c / peak - 1);
  }
  return -worst;
}

const ret = (closes, days) => (closes.length > days ? closes.at(-1) / closes.at(-1 - days) - 1 : null);

export function analyse(closes, profileKey = 'medium') {
  const p = PROFILES[profileKey];
  const clean = closes.filter((c) => Number.isFinite(c) && c > 0);
  if (clean.length < 60) return { error: 'Not enough price history (need at least 60 trading days).' };

  const price = clean.at(-1);
  const s50 = sma(clean, 50), s200 = sma(clean, 200);
  const vol = volatility(clean), dd = maxDrawdown(clean);
  const r1m = ret(clean, 21), r6m = ret(clean, 126), r1y = ret(clean, 252);
  const hi = Math.max(...clean.slice(-252)), lo = Math.min(...clean.slice(-252));
  const rangePos = hi === lo ? 0.5 : (price - lo) / (hi - lo);

  const pillars = {};

  // Trend: is price above its average prices?
  let t = 50; const tn = [];
  if (price > s50) { t += 20; tn.push('Price is above its 50-day average, a short-term positive.'); }
  else { t -= 20; tn.push('Price is below its 50-day average, a short-term negative.'); }
  if (s200 != null) {
    if (price > s200) { t += 20; tn.push('Price is above its 200-day average, a long-term positive.'); }
    else { t -= 20; tn.push('Price is below its 200-day average, a long-term negative.'); }
    t += s50 > s200 ? 10 : -10;
  } else tn.push('Less than 200 days of data, so the long-term trend is unknown.');
  pillars.trend = { title: 'Trend', score: clamp(t), notes: tn };

  // Momentum: recent and 6-month return.
  let m = 50; const mn = [];
  if (r6m != null) { m += clamp(r6m * 100, -30, 30); mn.push(`6-month return: ${pct(r6m)}.`); }
  if (r1m != null) { m += clamp(r1m * 100, -10, 10); mn.push(`1-month return: ${pct(r1m)}.`); }
  if (r1y != null) mn.push(`1-year return: ${pct(r1y)}.`);
  pillars.momentum = { title: 'Momentum', score: clamp(m), notes: mn };

  // Risk: swings and worst fall, compared with the user's comfort level.
  const volScore = clamp(100 - (vol / p.maxVol) * 50, 0, 100);
  const ddScore = clamp(100 - (dd / p.maxDrawdown) * 50, 0, 100);
  pillars.risk = {
    title: 'Risk',
    score: Math.round((volScore + ddScore) / 2),
    notes: [
      `Yearly price swings (volatility): ${pct(vol)}. Your comfort limit is about ${pct(p.maxVol)}.`,
      `Worst fall from a peak: ${pct(dd)}. Your comfort limit is about ${pct(p.maxDrawdown)}.`,
    ],
  };

  // Price level: where in the 52-week range. Low can mean a bargain or a falling knife.
  pillars.level = {
    title: 'Price level',
    score: clamp(100 - rangePos * 60),
    notes: [`Price is at ${(rangePos * 100).toFixed(0)}% of its 52-week range (0% = lowest, 100% = highest).`],
  };

  for (const k of Object.keys(pillars)) pillars[k].score = Math.round(pillars[k].score);
  const overall = Math.round(Object.entries(p.weights).reduce((s, [k, w]) => s + pillars[k].score * w, 0));

  // Confidence: how much to trust this reading. Capped because v0.1 ignores the company itself.
  const scores = Object.values(pillars).map((x) => x.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.sqrt(scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length);
  const dataPart = clamp(clean.length / 252, 0, 1) * 40;
  const agreePart = clamp(1 - spread / 40, 0, 1) * 30;
  const confidence = Math.round(dataPart + agreePart);

  const verdict = overall >= 65 ? 'Looks favourable' : overall >= 45 ? 'Mixed signals' : 'Be careful';
  return {
    profile: p.label, price, overall, verdict, confidence, pillars,
    caveats: [
      'This reading uses price history only. It does not yet look at company profits, debt or valuation.',
      'Past prices do not predict the future. This is education, not personal investment advice.',
    ],
  };
}
