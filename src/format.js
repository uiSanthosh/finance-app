// Number, range and chart helpers for the panel. Pure functions.

const SYMBOLS = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };
export const RANGES = { '1M': 21, '3M': 63, '6M': 126, All: Infinity };

export function money(value, currency) {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return (SYMBOLS[currency] ?? '') + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function sliceRange(points, key) {
  const n = RANGES[key];
  return n === Infinity ? points : points.slice(-(n + 1));
}

export function rangeStats(points) {
  const cs = points.map((p) => p.c);
  return { high: Math.max(...cs), low: Math.min(...cs), average: cs.reduce((a, b) => a + b, 0) / cs.length };
}

export function dayChange(points, price) {
  const prev = points.at(-2).c;
  return { amount: price - prev, percent: (price - prev) / prev };
}

// Line chart geometry. Returns SVG path strings and a function to find the point nearest an x position.
export function chartGeometry(points, width, height, pad = 6) {
  const cs = points.map((p) => p.c);
  const lo = Math.min(...cs), hi = Math.max(...cs);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const y = (v) => height - pad - ((v - lo) / span) * (height - 2 * pad);
  const coords = points.map((p, i) => [x(i), y(p.c)]);
  const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)},${cy.toFixed(1)}`).join('');
  const area = `${line}L${x(points.length - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`;
  const nearest = (px) => Math.max(0, Math.min(points.length - 1, Math.round(((px - pad) / (width - 2 * pad)) * (points.length - 1))));
  return { line, area, coords, nearest, up: points.at(-1).c >= points[0].c };
}
