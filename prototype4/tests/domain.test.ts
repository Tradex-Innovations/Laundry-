import test from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../lib/seed";
import { cancelDispatch, clone, csvText, dispatchErrors, newCart, newDispatch, normalizeLine, operational, saveDispatch, totals, uid } from "../lib/domain";
import type { Database, Dispatch, Line } from "../lib/types";

function mixed(db: Database) { return db.dispatches.find(d => d.customerId === "alexandra")!; }
function fresh(db: Database): Dispatch {
  const d = newDispatch(db, "Test Operator"); d.customerId = "alexandra"; d.siteId = "alex-main";
  d.carts[0].lines = [clone(mixed(db).carts[0].lines[0])]; return d;
}

test("mixed example keeps ownership and compatible totals separate", () => {
  const db = seedDatabase(); const d = mixed(db); const t = totals([d]);
  assert.equal(d.carts[0].lines.filter(l => l.itemId === "pillow").length, 2);
  assert.equal(t.customerPieces, 100); assert.equal(t.poolPieces, 90); assert.equal(t.pieces, 190);
  assert.equal(t.weights.kg, 12.5); assert.equal(t.weights.lb, 0);
  assert.equal(t.ownershipWeights.customer.kg, 12.5);
});
test("cart weights are counted once per cart, independent of its number of lines", () => {
  const d = mixed(seedDatabase()); const t = totals([d]);
  assert.equal(t.cartWeights.kg.tare, 34); assert.equal(t.cartWeights.kg.gross, 90.5);
  assert.equal(t.cartWeights.kg.net, 56.5); assert.equal(t.weighedCarts, 2);
});
test("bundle entry retains original quantity, unit, and size used", () => {
  const db = seedDatabase(); const d = fresh(db);
  d.carts[0].lines = [clone(mixed(db).carts[0].lines[1])];
  db.items.find(i => i.id === "pillow")!.bundleSize = 25;
  const record = saveDispatch(db, d, "Operator", true); const l = record.carts[0].lines[0];
  assert.equal(l.quantity, 5); assert.equal(l.unit, "bundles"); assert.equal(l.bundleSize, 10); assert.equal(l.equivalentPieces, 50);
});
test("invalid quantities and cart weighing are rejected", () => {
  const db = seedDatabase(); const d = fresh(db);
  for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
    d.carts[0].lines[0].quantity = quantity; assert.ok(dispatchErrors(db, d, true).length);
  }
  d.carts[0].lines[0].quantity = 1;
  d.carts[0].tare = 10; d.carts[0].gross = null;
  assert.match(dispatchErrors(db, d, true).join(" "), /both tare and gross/);
  d.carts[0].gross = 9; assert.match(dispatchErrors(db, d, true).join(" "), /below tare/);
  d.carts[0].gross = 10; assert.equal(dispatchErrors(db, d, true).length, 0);
});
test("only selected customer's own linen can be dispatched", () => {
  const db = seedDatabase(); const d = fresh(db); d.customerId = "blueview"; d.siteId = "blue-main";
  assert.match(dispatchErrors(db, d, true).join(" "), /another customer's linen/);
  d.carts[0].lines[0].ownerCustomerId = "blueview";
  db.assignments.find(a => a.customerId === "blueview" && a.itemId === "pillow")!.active = false;
  assert.match(dispatchErrors(db, d, true).join(" "), /no longer active or assigned/);
});
test("customer, matching site, and at least one item are required", () => {
  const db = seedDatabase(); const d = newDispatch(db, "Test");
  assert.ok(dispatchErrors(db, d, true).length >= 3);
  d.customerId = "alexandra"; d.siteId = "blue-main";
  assert.match(dispatchErrors(db, d, true).join(" "), /belonging/);
});
test("draft save and repeated confirm never duplicate records or confirmation activity", () => {
  const db = seedDatabase(); const before = db.dispatches.length; const d = fresh(db);
  const saved = saveDispatch(db, d, "Operator", false);
  const resumed = saveDispatch(db, saved, "Operator", false);
  const confirmed = saveDispatch(db, resumed, "Operator", true);
  const repeated = saveDispatch(db, resumed, "Operator", true);
  assert.equal(db.dispatches.length, before + 1); assert.equal(repeated.number, confirmed.number);
  assert.equal(db.activity.filter(a => a.dispatchId === d.id && a.action === "Dispatch confirmed").length, 1);
  assert.throws(() => saveDispatch(db, confirmed, "Operator", false), /locked/);
});
test("stale draft cannot overwrite an updated draft", () => {
  const db = seedDatabase(); const saved = saveDispatch(db, fresh(db), "Operator", false);
  const stale = clone(saved); saved.notes = "Update"; saveDispatch(db, saved, "Operator", false);
  assert.throws(() => saveDispatch(db, stale, "Operator", false), /another tab/);
});
test("confirmed document survives edits to customer, site, company and item masters", () => {
  const db = seedDatabase(); const original = clone(mixed(db));
  db.customers[0].name = "New name"; db.sites[0].address = "New address";
  db.company.name = "New company"; db.items[0].name = "New description"; db.items[0].bundleSize = 99;
  const confirmed = db.dispatches.find(d => d.id === original.id)!;
  assert.deepEqual(confirmed.snapshot, original.snapshot); assert.deepEqual(confirmed.carts, original.carts);
});
test("cancellation requires Admin and reason, preserves originals, and updates totals", () => {
  const db = seedDatabase(); const d = mixed(db); const originalCarts = clone(d.carts); const snapshot = clone(d.snapshot);
  assert.throws(() => cancelDispatch(db, d.id, "Reason", "Operator"), /Admin/);
  assert.throws(() => cancelDispatch(db, d.id, "  ", "Admin"), /reason/);
  assert.equal(totals(operational(db)).pieces, 190);
  cancelDispatch(db, d.id, "Delivery recalled", "Admin");
  assert.equal(totals(operational(db)).pieces, 0); assert.equal(totals(operational(db, true)).pieces, 190);
  assert.deepEqual(d.carts, originalCarts); assert.deepEqual(d.snapshot, snapshot);
  assert.ok(db.activity.some(a => a.dispatchId === d.id && a.action === "Dispatch cancelled"));
});
test("weight units never mix and cart weighing never distributes onto lines", () => {
  const db = seedDatabase(); const d = fresh(db); const l: Line = normalizeLine({ ...clone(mixed(db).carts[1].lines[0]), id: uid(), quantity: 2.5, unit: "lb" });
  d.carts.push({ ...newCart("lb"), tare: 1, gross: 10, lines: [l] });
  const before = clone(d.carts[1].lines); const record = saveDispatch(db, d, "Operator", true);
  const t = totals([record]); assert.equal(t.weights.lb, 2.5); assert.equal(t.weights.kg, 0);
  assert.equal(t.pieces, 100); assert.deepEqual(record.carts[1].lines, before);
});
test("CSV quotes fields and neutralizes spreadsheet formulas", () => {
  assert.equal(csvText([["=HYPERLINK(1)", 'name, "quoted"', 12.5]]), '\uFEFF"\'=HYPERLINK(1)","name, ""quoted""","12.5"');
});
