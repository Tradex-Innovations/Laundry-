import type { Database, Receipt, ReceivingInput, Role, WeightUnit } from "./types";
import { clone, fmt, log, today, uid } from "./domain";

// Retained for legacy batch integrations and previously saved receipts.
export function newReceipt(): ReceivingInput {
  return { id: uid(), customerId: "", siteId: "", receivedDate: today(), containers: 1, pieces: 0, weightKg: 0, reference: "", notes: "" };
}
export function newIncomingCart(weightUnit: WeightUnit = "kg"): ReceivingInput {
  return { ...newReceipt(), lines: [], tare: 0, gross: null, weightUnit, netWeight: null };
}
// Continue after existing numeric cart numbers without changing historical receipts.
export function nextIncomingCartNumber(db: Database): string {
  const last = (db.receipts || []).reduce((max, receipt) => {
    const value = Number(receipt.reference);
    return receipt.lines !== undefined && /^\d+$/.test(receipt.reference) && Number.isSafeInteger(value) ? Math.max(max, value) : max;
  }, 0);
  return String(last + 1);
}
export function incomingNet(input: ReceivingInput): number | null {
  return input.gross !== null && input.gross !== undefined && input.tare !== null && input.tare !== undefined ? Number((input.gross - input.tare).toFixed(8)) : null;
}
export function convertReceivingUnit(input: ReceivingInput, unit: WeightUnit): ReceivingInput {
  const from = input.weightUnit || "kg";
  if (from === unit) return input;
  const convert = (value: number | null | undefined) => value == null ? null : Number((value * (from === "kg" ? 1 / 0.45359237 : 0.45359237)).toFixed(8));
  const updated = { ...input, weightUnit: unit, tare: convert(input.tare), gross: convert(input.gross), lines: input.lines?.map(l => ({ ...l, weight: convert(l.weight) })) };
  return { ...updated, netWeight: incomingNet(updated) };
}
export function receiptWeightLabel(receipt: Receipt): string {
  return receipt.lines === undefined ? `${fmt(receipt.weightKg)} kg` : receipt.netWeight == null ? "Not weighed" : `${fmt(receipt.netWeight)} ${receipt.weightUnit || "kg"}`;
}
export function receivingErrors(db: Database, input: ReceivingInput): string[] {
  const errors: string[] = [];
  if (!db.customers.some(c => c.id === input.customerId && c.active)) errors.push("Select an active customer.");
  if (!db.sites.some(s => s.id === input.siteId && s.customerId === input.customerId && s.active)) errors.push("Select an active collection site belonging to this customer.");
  const date = new Date(input.receivedDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.receivedDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.receivedDate) errors.push("Enter a valid receiving date.");
  if (input.lines !== undefined) {
    if (!["kg", "lb"].includes(input.weightUnit || "")) errors.push("Choose kg or lb for the cart weight unit.");
    if (!input.lines.length) errors.push("Add at least one item to the incoming cart.");
    const items = new Set<string>(); const lineIds = new Set<string>();
    for (const line of input.lines) {
      const item = db.items.find(i => i.id === line.itemId && i.active);
      if (!item || !db.assignments.some(a => a.active && a.itemId === line.itemId && (a.ownership === "pool" || a.customerId === input.customerId))) errors.push(`${line.description || "Item"}: this linen is no longer active or assigned to this customer or the laundry pool.`);
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) errors.push(`${line.description || "Item"}: enter a positive whole-number quantity.`);
      if (line.weight !== null && (!Number.isFinite(line.weight) || line.weight < 0)) errors.push(`${line.description || "Item"}: weight must be zero or greater.`);
      if (items.has(line.itemId) || lineIds.has(line.id)) errors.push("Each item can appear only once in a cart. Edit its existing quantity.");
      items.add(line.itemId); lineIds.add(line.id);
    }
    if (!Number.isSafeInteger(input.lines.reduce((sum, l) => sum + l.quantity, 0))) errors.push("The total piece count is too large.");
    if ([input.tare, input.gross].some(w => w != null && (!Number.isFinite(w) || w < 0))) errors.push("Cart weights must be zero or greater.");
    if (input.gross == null && input.tare != null && input.tare > 0) errors.push("Enter gross weight or clear the tare weight.");
    if (input.gross != null && input.tare == null) errors.push("Enter tare weight, using zero if the cart has no tare.");
    if (input.gross != null && input.tare != null && input.gross < input.tare) errors.push("Gross weight cannot be below tare weight.");
  } else {
    if (!Number.isSafeInteger(input.containers) || input.containers < 1) errors.push("Enter at least one bag or cart, using a whole number.");
    if (!Number.isSafeInteger(input.pieces) || input.pieces < 0) errors.push("Piece count must be a whole number, zero or greater.");
    if (!Number.isFinite(input.weightKg) || input.weightKg < 0) errors.push("Weight must be a finite number, zero or greater.");
    if (!(input.pieces > 0 || input.weightKg > 0)) errors.push("Enter a piece count or a net weight before receiving linen.");
  }
  return [...new Set(errors)];
}
export function saveReceipt(db: Database, input: ReceivingInput, role: Role): Receipt {
  if (role === "SystemsAdministrator") throw new Error("Use a laundry owner or operator role to receive linen.");
  const existing = db.receipts?.find(r => r.id === input.id);
  if (existing) return clone(existing);
  const errors = receivingErrors(db, input);
  if (errors.length) throw new Error(errors.join("\n"));
  const receipts = db.receipts || [];
  const nextNumber = receipts.reduce((max, r) => Math.max(max, Number(r.number.replace("IN-", "")) || 0), 0) + 1;
  const customer = db.customers.find(c => c.id === input.customerId)!;
  const site = db.sites.find(s => s.id === input.siteId)!;
  const record: Receipt = { ...clone(input), reference: input.reference.trim(), notes: input.notes.trim(),
    number: `IN-${String(nextNumber).padStart(6, "0")}`, createdAt: new Date().toISOString(), createdBy: `Demo ${role}`,
    customerName: customer.name, siteName: site.name,
    snapshot: clone({ customer, site, company: db.company, createdBy: `Demo ${role}` }) };
  if (record.lines !== undefined) {
    record.reference = nextIncomingCartNumber(db);
    record.lines = record.lines.map(line => {
      const item = db.items.find(i => i.id === line.itemId)!;
      return { ...line, code: item.code, description: item.name, categoryName: db.categories.find(c => c.id === item.categoryId)?.name || "" };
    });
    record.containers = 1;
    record.pieces = record.lines.reduce((sum, line) => sum + line.quantity, 0);
    record.netWeight = incomingNet(record);
    record.weightKg = Number(((record.netWeight || 0) * (record.weightUnit === "lb" ? 0.45359237 : 1)).toFixed(8));
  }
  db.receipts = [record, ...receipts];
  log(db, role, "Linen received", `${record.number}: ${record.customerName}${record.lines ? ` · Cart ${record.reference} · ${record.pieces} pieces` : ""}`);
  return clone(record);
}
