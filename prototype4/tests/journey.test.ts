import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { localRepository } from "../lib/repository";
import { cancelDispatch, clone, emptyFilters, filterDispatches, newCart, newDispatch, normalizeLine, operational, saveDispatch, totals, uid } from "../lib/domain";
import { ManifestDocument } from "../components/Manifest";
import { buildRows } from "../components/Reports";
import type { Database, Line, Ownership, Unit } from "../lib/types";

test("complete persisted journey: customer + site + item + assignments → draft → confirm → manifest/reprint → cancel/report update", () => {
  const values = new Map<string, string>();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    localRepository.load();
    const customerId = uid(); const siteId = uid(); const itemId = uid();
    localRepository.update(db => {
      db.customers.push({ id: customerId, code: "JOURNEY", name: "Journey Hotel", contact: "Demo Contact", phone: "", email: "", active: true });
      db.sites.push({ id: siteId, customerId, name: "Main Hotel", department: "Housekeeping", address: "1 Demo Road", route: "DEMO", active: true });
      db.items.push({ id: itemId, code: "J-001", name: "Journey linen", categoryId: "Bedding", methods: ["pieces", "bundles", "weight"], defaultMethod: "pieces", bundleSize: 10, image: "", active: true });
      db.assignments.push({ id: uid(), itemId, customerId, ownership: "customer", active: true }, { id: uid(), itemId, customerId: null, ownership: "pool", active: true });
    });
    let db = localRepository.load();
    const line = (ownership: Ownership, quantity: number, unit: Unit): Line => normalizeLine({ id: uid(), itemId, code: "J-001", description: "Journey linen", ownership, ownerCustomerId: ownership === "customer" ? customerId : null, quantity, unit, bundleSize: unit === "bundles" ? 10 : null, equivalentPieces: null });
    const draft = newDispatch(db, "Journey Operator"); draft.customerId = customerId; draft.siteId = siteId;
    draft.carts[0].reference = "JOURNEY-01";
    draft.carts[0].lines = [line("customer", 100, "pieces"), line("pool", 5, "bundles"), line("pool", 40, "pieces")];
    draft.carts.push({ ...newCart(), reference: "JOURNEY-02", lines: [line("customer", 12.5, "kg")] });
    const saved = localRepository.update(state => saveDispatch(state, draft, "Operator", false)).result;
    db = localRepository.load();
    const reopened = clone(db.dispatches.find(d => d.id === saved.id)!);
    assert.equal(reopened.status, "Draft"); assert.equal(reopened.carts.length, 2);
    const confirmed = localRepository.update(state => saveDispatch(state, reopened, "Operator", true)).result;
    const beforePrint = JSON.stringify(localRepository.load());
    const html = renderToStaticMarkup(createElement(ManifestDocument, { db, record: confirmed }));
    assert.match(html, /Shipping Manifest/); assert.match(html, /Journey Hotel/); assert.match(html, /JOURNEY-01/);
    assert.match(html, /190 pieces/); assert.match(html, /12\.5 kg/); assert.match(html, /5 × 10 = 50 pieces/);
    assert.match(html, /Barcode LM-/); assert.doesNotMatch(html, /Invoice|Price|Amount due/);
    const located = filterDispatches(localRepository.load().dispatches, { ...emptyFilters, customerId, number: confirmed.number, cartReference: "JOURNEY-02", status: "Dispatched" });
    assert.equal(located.length, 1);
    const reprint = renderToStaticMarkup(createElement(ManifestDocument, { db, record: located[0] }));
    assert.equal(reprint, html); assert.equal(JSON.stringify(localRepository.load()), beforePrint);
    const reportRecords = (state: Database) => operational(state).filter(d => d.customerId === customerId);
    const beforeTotals = totals(reportRecords(localRepository.load()));
    assert.equal(beforeTotals.customerPieces, 100); assert.equal(beforeTotals.poolPieces, 90); assert.equal(beforeTotals.weights.kg, 12.5);
    const itemRows = buildRows(db, reportRecords(localRepository.load()), "Quantities dispatched by item");
    assert.equal(itemRows.rows.length, 4); // same code remains separate for ownership and entered unit
    localRepository.update(state => cancelDispatch(state, confirmed.id, "Journey validation cancellation", "Admin"));
    db = localRepository.load();
    assert.equal(totals(reportRecords(db)).pieces, 0); assert.equal(totals(reportRecords(db)).weights.kg, 0);
    assert.equal(buildRows(db, reportRecords(db), "Daily dispatch summary").rows.length, 0);
    assert.equal(db.dispatches.find(d => d.id === confirmed.id)?.status, "Cancelled");
    assert.deepEqual(db.dispatches.find(d => d.id === confirmed.id)?.snapshot, confirmed.snapshot);
    assert.equal(operational(db, true).filter(d => d.customerId === customerId).length, 1);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
