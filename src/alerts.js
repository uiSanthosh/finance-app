// Price-drop alerts: pure helpers shared by the panel and the background checker.

export function validateTarget(text, price) {
  const target = Number(String(text).replace(/,/g, ''));
  if (!Number.isFinite(target) || target <= 0) return { error: 'Enter a price greater than zero.' };
  if (target >= price) return { error: 'Pick a price below today\'s price. This alert fires when the price drops.' };
  return { target };
}

export const suggestTarget = (price) => Math.floor(price * 0.95);

// alerts: [{ id, symbol, target }], prices: { SYMBOL: latestPrice }
export function dueAlerts(alerts, prices) {
  return alerts.filter((a) => Number.isFinite(prices[a.symbol]) && prices[a.symbol] <= a.target);
}
