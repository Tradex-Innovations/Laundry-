import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seedDatabase } from "../lib/seed";
import { clone, newDispatch, saveDispatch, uid } from "../lib/domain";
import { inspectLaundry, laundryInventory, LIVE_LAUNDRY_ID } from "../lib/laundry-workspace";
import { ensurePlatform, laundryStats, saveLaundry } from "../lib/platform";
import { localRepository, STORAGE_KEY } from "../lib/repository";
import { ManifestDocument } from "../components/Manifest";
import LaundryDetails from "../components/LaundryDetails";
import type { Database } from "../lib/types";

function populateHarbour(db: Database) {
  const data = db.laundryWorkspaces!.harbour;
  // Matching local IDs are deliberate: the workspace boundary must isolate them.
  data.customers = [{ ...clone(db.customers[0]), name: "Harbour-only customer", code: "HBR-1" }];
  data.sites = [{ ...clone(db.sites[0]), name: "Harbour collection site" }];
  data.categories = [clone(db.categories[0])];
  data.items = [{ ...clone(db.items[0]), code: "HBR-PC", name: "Harbour-only pillowcase" }];
  data.assignments = db.assignments.filter(a => a.itemId === data.items[0].id && (a.customerId === data.customers[0].id || a.ownership === "pool")).map(clone);
  const scoped = inspectLaundry(db, "harbour", "SystemsAdministrator");
  const draft = newDispatch(scoped, "Harbour operator");
  draft.customerId = scoped.customers[0].id; draft.siteId = scoped.sites[0].id;
  const source = db.dispatches.find(d => d.status === "Dispatched")!.carts[0].lines[0];
  draft.carts[0].lines = [{ ...clone(source), quantity: 7, equivalentPieces: 7 }];
  const saved = saveDispatch(scoped, draft, "Operator", true);
  data.dispatches = [{ ...saved, number: "HW-000001" }];
  return data;
}

test("laundry inspection uses its own records even when local item and customer IDs overlap", () => {
  const db = seedDatabase(); populateHarbour(db);
  const before = JSON.stringify(db);
  const harbour = inspectLaundry(db, "harbour", "SystemsAdministrator");
  const pure = inspectLaundry(db, LIVE_LAUNDRY_ID, "SystemsAdministrator");
  assert.equal(harbour.items[0].name, "Harbour-only pillowcase");
  assert.equal(harbour.customers[0].name, "Harbour-only customer");
  assert.equal(harbour.dispatches.length, 1);
  assert.equal(pure.items[0].name, "White pillowcase");
  assert.equal(pure.dispatches.length, 3);
  assert.equal(harbour.laundries, undefined);
  assert.equal(harbour.users, undefined);
  assert.equal(harbour.laundryWorkspaces, undefined);
  harbour.items[0].name = "Attempted edit";
  harbour.dispatches.length = 0;
  assert.equal(JSON.stringify(db), before);
});

test("new and summary-only laundries start empty and never borrow live laundry data", () => {
  const db = seedDatabase();
  const summaryOnly = inspectLaundry(db, "harbour", "SystemsAdministrator");
  assert.equal(summaryOnly.items.length, 0);
  assert.equal(summaryOnly.dispatches.length, 0);
  assert.equal(laundryStats(db, db.laundries!.find(l => l.id === "harbour")!).items, 0);
  const created = saveLaundry(db, { id: uid(), code: "NEW", name: "New Laundry" }, "SystemsAdministrator");
  const fresh = inspectLaundry(db, created.id, "SystemsAdministrator");
  assert.equal(fresh.items.length, 0);
  assert.equal(fresh.assignments.length, 0);
  assert.equal(fresh.company.name, "New Laundry");
  assert.throws(() => inspectLaundry(db, "missing", "SystemsAdministrator"), /not found/);
  assert.throws(() => inspectLaundry(db, "harbour", "Admin"), /Systems Administrator/);
  assert.throws(() => inspectLaundry(db, "harbour", "Operator"), /Systems Administrator/);
});

test("inventory counts confirmed item quantities only, preserving ownership and weight units", () => {
  const db = seedDatabase();
  const view = inspectLaundry(db, LIVE_LAUNDRY_ID, "SystemsAdministrator");
  const rows = laundryInventory(view);
  const pillow = rows.find(r => r.item.id === "pillow")!;
  assert.equal(pillow.dispatched.customerPieces, 100);
  assert.equal(pillow.dispatched.poolPieces, 50);
  assert.equal(pillow.assignments.filter(a => a.ownership === "customer").length, 3);
  assert.equal(rows.find(r => r.item.id === "sheet")!.dispatched.pieces, 0); // Draft.
  const table = rows.find(r => r.item.id === "table")!;
  assert.equal(table.dispatched.weights.kg, 12.5); // Cancelled 8 kg excluded.
  assert.equal(table.dispatched.weights.lb, 0);
  assert.equal(table.dispatched.pieces, 0);
  const foreign = populateHarbour(db);
  const scoped = inspectLaundry(db, "harbour", "SystemsAdministrator");
  assert.equal(laundryInventory(scoped)[0].dispatched.pieces, 7);
  assert.equal(foreign.dispatches.length, 1);
});

test("laundry detail and manifest rendering use scoped company and historical records without writes", () => {
  const db = seedDatabase(); populateHarbour(db);
  const before = JSON.stringify(db);
  const laundry = db.laundries!.find(l => l.id === "harbour")!;
  const html = renderToStaticMarkup(createElement(LaundryDetails, { db, laundry }));
  assert.match(html, /Harbour Wash workspace/);
  assert.match(html, /Read-only/);
  assert.match(html, /Linen inventory/);
  assert.doesNotMatch(html, /Alexandra Hotel|Blue View Hotel|Edit|Deactivate/);
  const scoped = inspectLaundry(db, laundry.id, "SystemsAdministrator");
  const manifest = renderToStaticMarkup(createElement(ManifestDocument, { db: scoped, record: scoped.dispatches[0] }));
  assert.match(manifest, /Harbour-only customer/);
  assert.match(manifest, /Harbour-only pillowcase/);
  assert.match(manifest, /Harbour Wash/);
  assert.doesNotMatch(manifest, /Pure Linen Laundry|Alexandra Hotel/);
  assert.equal(JSON.stringify(db), before);
});

test("migration preserves existing operational data and persisted isolated workspaces", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
  try {
    const old = seedDatabase(); delete old.laundryWorkspaces;
    const original = clone(old.dispatches);
    storage.set(STORAGE_KEY, JSON.stringify(old));
    const migrated = localRepository.load();
    assert.deepEqual(migrated.dispatches, original);
    assert.ok(migrated.laundryWorkspaces?.harbour);
    localRepository.update(db => { populateHarbour(db); });
    const loaded = localRepository.load();
    const workspace = clone(loaded.laundryWorkspaces!.harbour);
    ensurePlatform(loaded);
    assert.deepEqual(loaded.laundryWorkspaces!.harbour, workspace);
    assert.equal(inspectLaundry(loaded, "harbour", "SystemsAdministrator").items[0].name, "Harbour-only pillowcase");
    assert.deepEqual(loaded.dispatches, original);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
