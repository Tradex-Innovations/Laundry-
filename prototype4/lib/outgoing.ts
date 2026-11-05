import type { Cart, Database, Dispatch, WeightUnit } from "./types";

function nextCartNumber(carts: Cart[]): number {
  return carts.reduce((max, cart) => {
    const value = Number(cart.reference);
    return /^\d+$/.test(cart.reference) && Number.isSafeInteger(value) ? Math.max(max, value) : max;
  }, 0) + 1;
}
// Legacy references stay intact; new carts use the next saved numeric reference.
export function nextOutgoingCartNumber(db: Database): number {
  return Math.max(db.nextOutgoingCartNumber || 1, nextCartNumber(db.dispatches.flatMap(d => d.carts)));
}
export function outgoingCartNumber(db: Database, draft: Dispatch, cart: Cart): string {
  if (cart.reference) return cart.reference;
  const next = Math.max(nextOutgoingCartNumber(db), nextCartNumber(draft.carts));
  const pending = draft.carts.filter(c => !c.reference);
  return String(next + pending.findIndex(c => c.id === cart.id));
}
export function numberOutgoingCarts(db: Database, carts: Cart[]): Cart[] {
  // Also account for historical references in the draft being saved.
  let next = Math.max(nextOutgoingCartNumber(db), nextCartNumber(carts));
  return carts.map(cart => cart.reference ? cart : { ...cart, reference: String(next++) });
}
export function convertOutgoingCartUnit(cart: Cart, unit: WeightUnit): Cart {
  if (cart.weightUnit === unit) return cart;
  const convert = (value: number | null) => value === null ? null : Number((value * (unit === "kg" ? 0.45359237 : 1 / 0.45359237)).toFixed(8));
  // Item quantities have their own explicit units and are independent of cart weighing.
  return { ...cart, weightUnit: unit, tare: convert(cart.tare), gross: convert(cart.gross) };
}
