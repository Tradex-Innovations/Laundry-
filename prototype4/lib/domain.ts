import type { Activity, Cart, Database, Dispatch, Filters, Line, Method, Role, Totals, Unit } from "./types";

export const uid = () => crypto.randomUUID();
export const clone = <T,>(value: T): T => structuredClone(value);
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const fmt = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 20 }).format(n);
export const ownerLabel = (owner: string) => owner === "customer" ? "Customer-owned" : "Laundry Pool";
export const methodOf = (unit: Unit): Method => unit === "kg" || unit === "lb" ? "weight" : unit;
export function newCart(weightUnit: "kg" | "lb" = "kg"): Cart {
  return { id: uid(), reference: "", comments: "", tare: null, gross: null, weightUnit, lines: [] };
}
export function newDispatch(db: Database, actor: string): Dispatch {
  const now = new Date().toISOString();
  return { id: uid(), number: "", customerId: "", siteId: "", shippingDate: today(), route: "", notes: "", status: "Draft",
    carts: [newCart(db.company.defaultWeightUnit)], createdAt: now, updatedAt: now, createdBy: actor,
    confirmedAt: null, cancelledAt: null, cancellationReason: "", snapshot: null, version: 0 };
}
export function lineErrors(line: Line): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors.push("Quantity must be greater than zero.");
  if ((line.unit === "pieces" || line.unit === "bundles") && !Number.isSafeInteger(line.quantity)) errors.push("Pieces and bundles must use whole numbers.");
  if (line.unit === "bundles" && (!line.bundleSize || !Number.isSafeInteger(line.bundleSize) || line.bundleSize < 1)) errors.push("Enter a positive whole-number bundle size.");
  if (line.unit === "bundles" && !Number.isSafeInteger(line.quantity * (line.bundleSize || 0))) errors.push("The bundle conversion is too large.");
  if (!["pieces", "bundles", "kg", "lb"].includes(line.unit)) errors.push("Select a valid quantity unit.");
  return errors;
}
export function normalizeLine(line: Line): Line {
  return { ...line, bundleSize: line.unit === "bundles" ? line.bundleSize : null,
    equivalentPieces: line.unit === "pieces" ? line.quantity : line.unit === "bundles" ? line.quantity * (line.bundleSize || 0) : null };
}
export function dispatchErrors(db: Database, d: Dispatch, confirming: boolean): string[] {
  const errors: string[] = [];
  const customer = db.customers.find(c => c.id === d.customerId && c.active);
  const site = db.sites.find(s => s.id === d.siteId && s.customerId === d.customerId && s.active);
  if (!customer) errors.push("Select an active customer.");
  if (!site) errors.push("Select an active delivery site belonging to this customer.");
  const parsedDate = new Date(d.shippingDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.shippingDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== d.shippingDate) errors.push("Enter a valid shipping date.");
  if (confirming && !d.carts.some(c => c.lines.length)) errors.push("Add at least one valid item line before dispatch.");
  d.carts.forEach((cart, index) => {
    const label = `Cart ${index + 1}`;
    if (confirming && !cart.lines.length) errors.push(`${label}: add a line or remove the empty cart.`);
    if ((cart.tare === null) !== (cart.gross === null)) errors.push(`${label}: enter both tare and gross weights, or leave both blank.`);
    if ([cart.tare, cart.gross].some(w => w !== null && (!Number.isFinite(w) || w < 0))) errors.push(`${label}: weights must be zero or greater.`);
    if (cart.tare !== null && cart.gross !== null && cart.gross < cart.tare) errors.push(`${label}: gross weight cannot be below tare weight.`);
    cart.lines.forEach(line => {
      errors.push(...lineErrors(line).map(error => `${label}, ${line.code}: ${error}`));
      const item = db.items.find(i => i.id === line.itemId && i.active);
      const assignment = db.assignments.find(a => a.itemId === line.itemId && a.active && a.ownership === line.ownership &&
        (a.ownership === "pool" ? a.customerId === null : a.customerId === d.customerId));
      if (!item || !assignment) errors.push(`${label}, ${line.code}: this linen is no longer active or assigned to this customer/pool. Remove or reconfigure it.`);
      if (line.ownership === "customer" && line.ownerCustomerId !== d.customerId) errors.push(`${label}, ${line.code}: another customer's linen cannot be dispatched.`);
      if (line.ownership === "pool" && line.ownerCustomerId !== null) errors.push(`${label}, ${line.code}: pool linen must belong to the laundry.`);
      if (item && !item.methods.includes(methodOf(line.unit))) errors.push(`${label}, ${line.code}: the selected quantity method is no longer allowed.`);
    });
  });
  return [...new Set(errors)];
}
export function log(db: Database, actor: string, action: string, detail: string, dispatchId?: string) {
  const entry: Activity = { id: uid(), at: new Date().toISOString(), actor, action, detail, ...(dispatchId ? { dispatchId } : {}) };
  db.activity.unshift(entry);
}
export function saveDispatch(db: Database, draft: Dispatch, role: Role, confirm: boolean): Dispatch {
  const existing = db.dispatches.find(d => d.id === draft.id);
  // A repeated confirm is idempotent; a confirmed or cancelled record is never rewritten.
  if (existing && existing.status !== "Draft") {
    if (confirm && existing.status === "Dispatched") return clone(existing);
    throw new Error("This record is locked. Open its saved version from history.");
  }
  if (existing && existing.version !== draft.version) throw new Error("This draft changed in another tab. Reopen it from Draft Dispatches before saving.");
  const errors = dispatchErrors(db, draft, confirm);
  if (errors.length) throw new Error(errors.join("\n"));
  const now = new Date().toISOString();
  const record = clone(draft);
  record.number = existing?.number || `LM-${String(db.nextNumber++).padStart(6, "0")}`;
  record.version = (existing?.version || 0) + 1;
  record.updatedAt = now;
  record.carts = record.carts.map(cart => ({ ...cart, lines: cart.lines.map(line => {
    const item = db.items.find(i => i.id === line.itemId)!;
    return normalizeLine({ ...line, code: item.code, description: item.name });
  }) }));
  if (confirm) {
    record.status = "Dispatched";
    record.confirmedAt = now;
    record.snapshot = clone({ customer: db.customers.find(c => c.id === record.customerId)!, site: db.sites.find(s => s.id === record.siteId)!, company: db.company, createdBy: record.createdBy });
  }
  const index = db.dispatches.findIndex(d => d.id === record.id);
  if (index < 0) db.dispatches.unshift(record); else db.dispatches[index] = record;
  log(db, role, confirm ? "Dispatch confirmed" : "Draft saved", record.number, record.id);
  return clone(record);
}
export function cancelDispatch(db: Database, id: string, reason: string, role: Role) {
  if (role !== "Admin") throw new Error("Only an Admin can cancel a confirmed dispatch.");
  if (!reason.trim()) throw new Error("A cancellation reason is required.");
  const record = db.dispatches.find(d => d.id === id);
  if (!record || record.status !== "Dispatched") throw new Error("Only a confirmed dispatch can be cancelled.");
  record.status = "Cancelled";
  record.cancellationReason = reason.trim();
  record.cancelledAt = new Date().toISOString();
  record.updatedAt = record.cancelledAt;
  record.version += 1;
  log(db, role, "Dispatch cancelled", `${record.number}: ${reason.trim()}`, id);
}
export function totals(records: Dispatch[]): Totals {
  const result: Totals = { customerPieces: 0, poolPieces: 0, pieces: 0, weights: { kg: 0, lb: 0 },
    ownershipWeights: { customer: { kg: 0, lb: 0 }, pool: { kg: 0, lb: 0 } }, carts: 0, weighedCarts: 0,
    cartWeights: { kg: { tare: 0, gross: 0, net: 0, count: 0 }, lb: { tare: 0, gross: 0, net: 0, count: 0 } } };
  for (const d of records) for (const cart of d.carts) {
    result.carts += 1;
    if (cart.tare !== null && cart.gross !== null) {
      result.weighedCarts += 1;
      const w = result.cartWeights[cart.weightUnit];
      w.tare += cart.tare; w.gross += cart.gross; w.net += cart.gross - cart.tare; w.count += 1;
    }
    for (const line of cart.lines) {
      if (line.unit === "kg" || line.unit === "lb") {
        result.weights[line.unit] += line.quantity;
        result.ownershipWeights[line.ownership][line.unit] += line.quantity;
      } else {
        const pieces = line.unit === "pieces" ? line.quantity : line.quantity * (line.bundleSize || 0);
        if (line.ownership === "customer") result.customerPieces += pieces; else result.poolPieces += pieces;
        result.pieces += pieces;
      }
    }
  }
  return result;
}
export const operational = (db: Database, includeCancelled = false) => db.dispatches.filter(d => d.status === "Dispatched" || (includeCancelled && d.status === "Cancelled"));
export const emptyFilters: Filters = { customerId: "", from: "", to: "", status: "", number: "", cartReference: "" };
export function filterDispatches(records: Dispatch[], f: Filters) {
  return records.filter(d => (!f.customerId || d.customerId === f.customerId) && (!f.from || d.shippingDate >= f.from) &&
    (!f.to || d.shippingDate <= f.to) && (!f.status || d.status === f.status) &&
    (!f.number || d.number.toLowerCase().includes(f.number.toLowerCase())) &&
    (!f.cartReference || d.carts.some(c => c.reference.toLowerCase().includes(f.cartReference.toLowerCase()))));
}
export function csvText(rows: (string | number)[][]) {
  // Spreadsheet programs must treat user-entered fields as text, never formulas.
  return "\uFEFF" + rows.map(row => row.map(value => {
    const raw = String(value);
    const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}
