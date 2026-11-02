import test from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../lib/seed";
import { clone } from "../lib/domain";
import { newReceipt, receivingErrors, saveReceipt } from "../lib/receiving";
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
