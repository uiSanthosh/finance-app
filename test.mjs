import assert from 'node:assert/strict';
import { analyse, maxDrawdown, volatility } from './src/analysis.js';
import { toSymbol } from './src/data.js';

const up = Array.from({ length: 260 }, (_, i) => 100 * 1.001 ** i);
const down = Array.from({ length: 260 }, (_, i) => 100 * 0.998 ** i);
const a = analyse(up, 'medium'), b = analyse(down, 'medium');
assert.ok(a.overall > b.overall, 'uptrend should outscore downtrend');
assert.ok(a.pillars.trend.score > 80 && b.pillars.trend.score < 20);
assert.equal(maxDrawdown([100, 50, 75]), 0.5);
assert.ok(volatility(up) < 1e-9, 'constant growth has no volatility');
assert.ok(analyse(up.slice(0, 20)).error);
assert.ok(a.confidence >= 0 && a.confidence <= 70);
assert.equal(toSymbol('tcs', 'IN'), 'TCS.NS');
assert.equal(toSymbol('aapl', 'US'), 'AAPL');
assert.equal(toSymbol('500325.BO', 'IN'), '500325.BO');
console.log('ok', a.overall, a.verdict, a.confidence, '|', b.overall, b.verdict, b.confidence);
