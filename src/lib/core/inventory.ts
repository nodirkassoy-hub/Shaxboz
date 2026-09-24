import type { StockMap, StockCell } from '../types';

export type CostMethod = 'FIFO' | 'AVG';

// Inventory sub-ledger. Values are kept as integer so'm so that the
// sub-ledger always reconciles exactly with GL inventory accounts.

export const cell = (stock: StockMap, productId: string, whId: string): StockCell => {
  if (!stock[productId]) stock[productId] = {};
  if (!stock[productId][whId]) stock[productId][whId] = { qty: 0, value: 0, layers: [] };
  return stock[productId][whId];
};

export const peek = (stock: StockMap, productId: string, whId?: string) => {
  const p = stock[productId]; if (!p) return { qty: 0, value: 0 };
  if (whId) return { qty: p[whId]?.qty || 0, value: p[whId]?.value || 0 };
  return Object.values(p).reduce((a, c) => ({ qty: a.qty + c.qty, value: a.value + c.value }), { qty: 0, value: 0 });
};

export const unitCost = (stock: StockMap, productId: string, whId?: string) => {
  const { qty, value } = peek(stock, productId, whId); return qty > 0 ? value / qty : 0;
};

/** Add stock with a TOTAL value (integer so'm). AVG merges into one layer; FIFO appends a layer. */
export function addStock(stock: StockMap, method: CostMethod, productId: string, whId: string, qty: number, total: number, date: string, batch: string, ref: string) {
  if (!(qty > 0)) throw new Error('Miqdor musbat bo‘lishi kerak');
  total = Math.round(total);
  const c = cell(stock, productId, whId);
  if (method === 'AVG') {
    const nq = c.qty + qty; const nv = c.value + total;
    c.layers = [{ qty: nq, cost: nq ? nv / nq : 0, date, batch, ref }];
    c.qty = nq; c.value = nv;
  } else {
    c.layers.push({ qty, cost: total / qty, date, batch, ref });
    c.qty += qty; c.value += total;
  }
}

/** Remove stock and return the consumed integer value. Throws if insufficient. */
export function takeStock(stock: StockMap, method: CostMethod, productId: string, whId: string, qty: number): { value: number; batches: string[] } {
  const c = cell(stock, productId, whId);
  if (!(qty > 0)) throw new Error('Miqdor musbat bo‘lishi kerak');
  if (c.qty + 1e-9 < qty) throw new Error(`Omborda yetarli qoldiq yo‘q (mavjud: ${+c.qty.toFixed(2)}, kerak: ${qty})`);
  const batches: string[] = [];
  let value: number;
  if (Math.abs(c.qty - qty) < 1e-9) {
    value = c.value; c.layers.forEach((l) => batches.push(l.batch));
    c.qty = 0; c.value = 0; c.layers = [];
    return { value, batches };
  }
  if (method === 'AVG') {
    value = Math.round((c.value / c.qty) * qty);
    c.qty -= qty; c.value -= value;
    if (c.layers[0]) { c.layers[0].qty = c.qty; c.layers[0].cost = c.value / c.qty; batches.push(c.layers[0].batch); }
  } else {
    let left = qty; let raw = 0;
    while (left > 1e-9 && c.layers.length) {
      const L = c.layers[0]; const use = Math.min(left, L.qty);
      raw += use * L.cost; L.qty -= use; left -= use; batches.push(L.batch);
      if (L.qty < 1e-9) c.layers.shift();
    }
    value = Math.round(raw); c.qty -= qty; c.value -= value;
  }
  return { value, batches: [...new Set(batches)] };
}
