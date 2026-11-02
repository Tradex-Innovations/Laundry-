import type { Database, Receipt, ReceivingInput, Role } from "./types";
import { clone, log, today, uid } from "./domain";

export function newReceipt(): ReceivingInput {
  return { id: uid(), customerId: "", siteId: "", receivedDate: today(), containers: 1, pieces: 0, weightKg: 0, reference: "", notes: "" };
}

export function receivingErrors(db: Database, input: ReceivingInput): string[] {
  const errors: string[] = [];
  if (!db.customers.some(c => c.id === input.customerId && c.active)) errors.push("Select an active customer.");
  if (!db.sites.some(s => s.id === input.siteId && s.customerId === input.customerId && s.active)) errors.push("Select an active collection site belonging to this customer.");
  const date = new Date(input.receivedDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.receivedDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.receivedDate) errors.push("Enter a valid receiving date.");
  if (!Number.isSafeInteger(input.containers) || input.containers < 1) errors.push("Enter at least one bag or cart, using a whole number.");
  if (!Number.isSafeInteger(input.pieces) || input.pieces < 0) errors.push("Piece count must be a whole number, zero or greater.");
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0) errors.push("Weight must be a finite number, zero or greater.");
  if (!(input.pieces > 0 || input.weightKg > 0)) errors.push("Enter a piece count or a net weight before receiving linen.");
  return errors;
}

export function saveReceipt(db: Database, input: ReceivingInput, role: Role): Receipt {
  const existing = db.receipts?.find(r => r.id === input.id);
  if (existing) return clone(existing);
  const errors = receivingErrors(db, input);
  if (errors.length) throw new Error(errors.join("\n"));
  const receipts = db.receipts || [];
  const nextNumber = receipts.reduce((max, r) => Math.max(max, Number(r.number.replace("IN-", "")) || 0), 0) + 1;
  const record: Receipt = { ...clone(input), reference: input.reference.trim(), notes: input.notes.trim(),
    number: `IN-${String(nextNumber).padStart(6, "0")}`, createdAt: new Date().toISOString(), createdBy: `Demo ${role}`,
    customerName: db.customers.find(c => c.id === input.customerId)!.name,
    siteName: db.sites.find(s => s.id === input.siteId)!.name };
  db.receipts = [record, ...receipts];
  log(db, role, "Linen received", `${record.number}: ${record.customerName}`);
  return clone(record);
}
