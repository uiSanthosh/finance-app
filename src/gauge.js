// The "Should you buy this now?" reading: blends price signals and company health for a holding horizon.
// It reports Good time / Wait / Bad time with reasons. It never says "buy".

export const HORIZONS = { '1M': { label: '1 Month', price: 0.8 }, '6M': { label: '6 Months', price: 0.5 }, '1Y': { label: '1+ Year', price: 0.25 } };
const RATING_SCORE = { good: 100, ok: 55, bad: 15 };

export function fundamentalsScore(metrics) {
  if (!metrics.length) return null;
  return metrics.reduce((s, m) => s + RATING_SCORE[m.rating], 0) / metrics.length;
}

export function goodTime(report, metrics, horizonKey) {
  const f = fundamentalsScore(metrics);
  const wPrice = f == null ? 1 : HORIZONS[horizonKey].price;
  const score = Math.round(report.overall * wPrice + (f ?? 0) * (1 - wPrice));
  const verdict = score >= 65 ? 'Good time' : score >= 45 ? 'Wait' : 'Bad time';
  const good = [], watch = [];
  for (const p of Object.values(report.pillars)) {
    if (p.score >= 65) good.push(`${p.title}: ${p.notes[0]}`);
    else if (p.score <= 40) watch.push(`${p.title}: ${p.notes[0]}`);
  }
  for (const m of metrics) {
    if (m.rating === 'good') good.push(`${m.label} ${m.value}: ${m.note}`);
    else if (m.rating === 'bad') watch.push(`${m.label} ${m.value}: ${m.note}`);
  }
  // Price-only readings top out at the report's own cap; company data adds up to 30 points of confidence.
  const confidence = Math.min(100, Math.round(report.confidence + Math.min(metrics.length, 5) * 6));
  return { score, verdict, good: good.slice(0, 3), watch: watch.slice(0, 3), confidence, hasCompanyData: f != null };
}

const SEGMENT_COLORS = ['#ef4444', '#f59e0b', '#c5d94a', '#5cc96a', '#2e9b45'];

// Semicircle gauge: five coloured arcs left (bad) to right (good) and a needle for the score.
export function gaugeGeometry(score, cx = 80, cy = 78, r = 62, width = 16) {
  const pt = (radius, t) => [cx + radius * Math.cos(Math.PI * (1 - t)), cy - radius * Math.sin(Math.PI * (1 - t))];
  const segments = SEGMENT_COLORS.map((color, i) => {
    const [x1, y1] = pt(r, i / 5 + 0.006), [x2, y2] = pt(r, (i + 1) / 5 - 0.006);
    return { color, d: `M${x1.toFixed(1)},${y1.toFixed(1)}A${r},${r} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`, width };
  });
  const [nx, ny] = pt(r - 20, Math.max(0, Math.min(100, score)) / 100);
  return { segments, needle: { x: nx, y: ny }, cx, cy };
}
