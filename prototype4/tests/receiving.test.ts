import test from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../lib/seed";
import { clone } from "../lib/domain";
import { newReceipt, newIncomingCart, nextIncomingCartNumber, receivingErrors, saveReceipt } from "../lib/receiving";
import { localRepository, STORAGE_KEY } from "../lib/repository";

function batch() { return { ...newReceipt(), customerId: "alexandra", siteId: "alex-main", containers: 2, pieces: 100, weightKg: 12.5 }; }

test("receiving records persist on an existing database without changing dispatch totals", () => {
  const store = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } });
  try {
    const old = seedDatabase(); delete old.receipts;
    const dispatches = clone(old.dispatches);
    store.set(STORAGE_KEY, JSON.stringify(old));
    const input = batch();
    const result = localRepository.update(db => saveReceipt(db, input, "Operator"));
    assert.equal(result.result.number, "IN-000001");
    const loaded = localRepository.load();
    assert.equal(loaded.receipts?.[0].weightKg, 12.5);
    assert.equal(loaded.receipts?.[0].pieces, 100);
    assert.deepEqual(loaded.dispatches, dispatches);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("receipt confirmation is idempotent and snapshots customer details", () => {
  const db = seedDatabase(); const input = batch();
  const first = saveReceipt(db, input, "Operator");
  db.customers.find(c => c.id === input.customerId)!.name = "Renamed customer";
  const repeat = saveReceipt(db, input, "Operator");
  assert.deepEqual(repeat, first);
  assert.equal(db.receipts?.length, 1);
  assert.equal(db.activity.filter(a => a.action === "Linen received").length, 1);
  assert.equal(saveReceipt(db, batch(), "Admin").number, "IN-000002");
});

test("receiving rejects mismatched sites, inactive customers, invalid dates and quantities", () => {
  const db = seedDatabase();
  for (const patch of [{ siteId: "blue-main" }, { receivedDate: "2026-02-30" }, { receivedDate: "invalid" }, { containers: 0 }, { containers: 1.5 }, { pieces: -1 }, { pieces: 2.5 }, { weightKg: Infinity }, { weightKg: -1 }, { pieces: 0, weightKg: 0 }]) {
    assert.throws(() => saveReceipt(db, { ...batch(), ...patch }, "Operator"));
  }
  assert.equal(db.receipts?.length || 0, 0);
  db.customers.find(c => c.id === "alexandra")!.active = false;
  assert.ok(receivingErrors(db, batch()).length);
});

test("receiving accepts pieces-only and weight-only batches independently", () => {
  const db = seedDatabase();
  assert.equal(receivingErrors(db, { ...batch(), pieces: 0 }).length, 0);
  assert.equal(receivingErrors(db, { ...batch(), weightKg: 0 }).length, 0);
});

test("incoming cart numbers increment only on save and continue after persisted carts", () => {
  const db = seedDatabase();
  const cart = () => ({ ...newIncomingCart(), customerId: "alexandra", siteId: "alex-main",
    lines: [{ id: "line", itemId: "pillow", code: "PC-001", description: "White pillowcase", categoryName: "Bedding", quantity: 2, weight: null }] });
  const firstDraft = cart(); const secondDraft = cart();
  assert.equal(nextIncomingCartNumber(db), "1");
  assert.equal(receivingErrors(db, firstDraft).length, 0);
  assert.throws(() => saveReceipt(db, { ...cart(), lines: [] }, "Operator"));
  assert.equal(nextIncomingCartNumber(db), "1");
  const first = saveReceipt(db, firstDraft, "Operator");
  assert.equal(first.reference, "1");
  assert.equal(saveReceipt(db, secondDraft, "Admin").reference, "2");
  assert.equal(saveReceipt(db, firstDraft, "Operator").reference, "1");
  assert.equal(nextIncomingCartNumber(db), "3");
  // Previously entered numbers stay intact; old batch references are not cart numbers.
  db.receipts!.push({ ...first, id: "previous-cart", reference: "36" });
  db.receipts!.push({ ...first, id: "previous-batch", reference: "900", lines: undefined });
  const reloaded = JSON.parse(JSON.stringify(db));
  assert.equal(nextIncomingCartNumber(reloaded), "37");
  assert.equal(saveReceipt(reloaded, { ...cart(), reference: "999" }, "Operator").reference, "37");
  assert.equal(nextIncomingCartNumber(reloaded), "38");
  assert.equal(reloaded.receipts.find((r: { id: string }) => r.id === "previous-cart").reference, "36");
  assert.equal(nextIncomingCartNumber(seedDatabase()), "1");
});

test("item-based receiving saves canonical item snapshots, quantities and cart weights", async () => {
  const { newIncomingCart } = await import("../lib/receiving");
  const db = seedDatabase();
  const item = db.items[0];
  const input = { ...newIncomingCart("lb"), customerId: "alexandra", siteId: "alex-main", reference: "36", tare: 135, gross: 200,
    containers: 99, pieces: 9999, weightKg: 9999,
    lines: [{ id: "in-line-1", itemId: item.id, code: "stale-code", description: "stale-name", categoryName: "stale-category", quantity: 12, weight: 4.5 }] };
  const originalDispatches = clone(db.dispatches);
  const record = saveReceipt(db, input, "Operator");
  assert.equal(record.pieces, 12); assert.equal(record.containers, 1);
  assert.equal(record.netWeight, 65); assert.equal(record.weightUnit, "lb");
  assert.equal(record.weightKg, 29.48350405);
  assert.equal(record.lines?.[0].code, item.code);
  assert.equal(record.lines?.[0].description, item.name);
  assert.equal(record.lines?.[0].categoryName, "Bedding");
  assert.equal(record.lines?.[0].weight, 4.5);
  assert.deepEqual(db.dispatches, originalDispatches);
  db.items[0].name = "New item name"; db.customers[0].name = "New customer name"; db.company.name = "New company";
  assert.equal(record.lines?.[0].description, "White pillowcase");
  assert.equal(record.snapshot?.customer.name, "Alexandra Hotel");
  assert.equal(record.snapshot?.company.name, "Pure Linen Laundry");
  assert.deepEqual(saveReceipt(db, input, "Operator"), record);
  assert.equal(db.receipts?.length, 1);
});

test("cart receiving validates every item and never accepts another customer's assignment", async () => {
  const { newIncomingCart } = await import("../lib/receiving");
  const db = seedDatabase();
  const line = { id: "incoming-line", itemId: "pillow", code: "PC-001", description: "White pillowcase", categoryName: "Bedding", quantity: 12, weight: null };
  const input = { ...newIncomingCart(), customerId: "alexandra", siteId: "alex-main", reference: "36", lines: [line] };
  assert.equal(receivingErrors(db, input).length, 0); // Piece-only cart is valid.
  for (const patch of [{ lines: [] }, { lines: [{ ...line, quantity: 0 }] }, { lines: [{ ...line, quantity: 1.5 }] }, { lines: [{ ...line, quantity: Infinity }] }, { lines: [{ ...line, weight: -1 }] }, { lines: [{ ...line, weight: Infinity }] }, { lines: [line, { ...line, id: "duplicate" }] }, { weightUnit: "stone" as "kg" }, { tare: 10, gross: 9 }, { tare: 10, gross: null }, { tare: null, gross: 10 }, { gross: Infinity }, { tare: -1 }]) {
    assert.throws(() => saveReceipt(db, { ...input, ...patch }, "Operator"));
  }
  db.assignments = db.assignments.filter(a => a.itemId !== "pillow" || (a.ownership === "customer" && a.customerId === "blueview"));
  assert.throws(() => saveReceipt(db, input, "Operator"), /assigned/);
  assert.equal(db.receipts?.length || 0, 0);
  assert.throws(() => saveReceipt(db, input, "SystemsAdministrator"), /owner or operator/);
});

test("switching the incoming weight unit preserves physical weights and item weights", async () => {
  const { convertReceivingUnit, incomingNet, newIncomingCart } = await import("../lib/receiving");
  const input = { ...newIncomingCart("kg"), tare: 10, gross: 30, lines: [{ id: "line", itemId: "pillow", code: "PC-001", description: "Pillowcase", categoryName: "Bedding", quantity: 12, weight: 5 }] };
  const lb = convertReceivingUnit(input, "lb");
  assert.ok(Math.abs(lb.tare! - 22.04622622) < 0.000001);
  assert.ok(Math.abs(incomingNet(lb)! - 44.09245244) < 0.000001);
  const kg = convertReceivingUnit(lb, "kg");
  assert.ok(Math.abs(kg.tare! - 10) < 0.000001);
  assert.ok(Math.abs(kg.gross! - 30) < 0.000001);
  assert.ok(Math.abs(kg.lines![0].weight! - 5) < 0.000001);
  assert.equal(input.weightUnit, "kg"); assert.equal(input.lines[0].weight, 5);
});

test("a persisted incoming cart reloads with its item lines and renders an immutable receipt", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { IncomingReceiptDocument } = await import("../components/ReceivingDocument");
  const { newIncomingCart } = await import("../lib/receiving");
  const { laundryInventory } = await import("../lib/laundry-workspace");
  const store = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } });
  try {
    const input = { ...newIncomingCart("kg"), customerId: "alexandra", siteId: "alex-main", reference: "36", tare: 5, gross: 35,
      lines: [{ id: "pillow-in", itemId: "pillow", code: "PC-001", description: "White pillowcase", categoryName: "Bedding", quantity: 12, weight: 2 }, { id: "mat-in", itemId: "mat", code: "BM-001", description: "Bath mat", categoryName: "Towels", quantity: 25, weight: null }] };
    const saved = localRepository.update(db => saveReceipt(db, input, "Operator")).result;
    const db = localRepository.load();
    assert.equal(db.receipts![0].lines?.length, 2);
    assert.equal(db.receipts![0].pieces, 37);
    assert.equal(db.receipts![0].weightKg, 30);
    const before = JSON.stringify(db);
    const html = renderToStaticMarkup(createElement(IncomingReceiptDocument, { db, record: saved }));
    assert.match(html, /Incoming Linen Receipt/); assert.match(html, /White pillowcase/); assert.match(html, /Bath mat/);
    assert.equal(saved.reference, "1"); assert.match(html, /37/); assert.match(html, /30 kg/);
    assert.equal(JSON.stringify(db), before);
    const inventory = laundryInventory(db);
    assert.equal(inventory.find(r => r.item.id === "pillow")!.received.pieces, 12);
    assert.equal(inventory.find(r => r.item.id === "pillow")!.received.weights.kg, 2);
    assert.equal(inventory.find(r => r.item.id === "pillow")!.received.weights.lb, 0);
    assert.equal(inventory.find(r => r.item.id === "mat")!.received.weights.kg, 0); // Cart net is never allocated to lines.
    assert.equal(inventory.find(r => r.item.id === "pillow")!.dispatched.pieces, 150); // Receiving does not alter dispatched quantities.
    db.company.name = "Changed company"; db.items[0].name = "Changed item";
    const reprint = renderToStaticMarkup(createElement(IncomingReceiptDocument, { db, record: db.receipts![0] }));
    assert.equal(reprint, html);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
