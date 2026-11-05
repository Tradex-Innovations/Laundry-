import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seedDatabase } from "../lib/seed";
import { cancelDispatch, clone, newDispatch, operational, saveDispatch, today, totals, uid } from "../lib/domain";
import { assignDeliveries, deliveryFor, deliveryRecords, saveDriver } from "../lib/deliveries";
import { inspectLaundry } from "../lib/laundry-workspace";
import { localRepository, STORAGE_KEY } from "../lib/repository";
import { ManifestDocument } from "../components/Manifest";
import type { Database } from "../lib/types";

function packed(db: Database) {
  const draft = newDispatch(db, "Demo Operator"); draft.customerId = "alexandra"; draft.siteId = "alex-main"; draft.route = "AM-01";
  draft.carts[0].lines = [{ ...clone(db.dispatches.find(d => d.status === "Dispatched")!.carts[0].lines[0]), id: uid(), quantity: 12, equivalentPieces: 12 }];
  return draft;
}
const input = (ids: string[]) => ({ targets: ids.map(dispatchId => ({ dispatchId, version: 0 })), driverId: "driver-am", route: "AM-01", scheduledDate: today() });

test("preparing a manifest locks its details but does not record a physical dispatch", () => {
  const db = seedDatabase(); const draft = packed(db); const before = totals(operational(db));
  const ready = saveDispatch(db, draft, "Operator", "manifest");
  assert.equal(ready.status, "Ready"); assert.ok(ready.preparedAt); assert.equal(ready.confirmedAt, null);
  assert.ok(ready.snapshot); assert.deepEqual(totals(operational(db)), before);
  assert.deepEqual(saveDispatch(db, draft, "Operator", "manifest"), ready);
  assert.throws(() => saveDispatch(db, ready, "Operator", false), /locked/);
  assert.throws(() => saveDispatch(db, ready, "Operator", true), /locked/);
  assert.equal(db.activity.filter(a => a.action === "Manifest prepared").length, 1);
  assert.ok(deliveryRecords(db).some(d => d.id === ready.id));
  assert.throws(() => saveDispatch(db, packed(db), "SystemsAdministrator", "manifest"), /owner or operator/);
});

test("only the owner manages active drivers while historical assignment contact details stay stable", () => {
  const db = seedDatabase(); const driver = { id: "local-driver", name: "  Test Driver  ", phone: " 01234 ", vehicle: " Van 3 ", active: true };
  assert.throws(() => saveDriver(db, driver, "Operator"), /owner/);
  assert.throws(() => saveDriver(db, driver, "SystemsAdministrator"), /owner/);
  assert.equal(saveDriver(db, driver, "Admin").name, "Test Driver");
  assert.throws(() => saveDriver(db, { ...driver, id: "duplicate", name: "test driver" }, "Admin"), /already exists/);
  const ready = saveDispatch(db, packed(db), "Operator", "manifest");
  const saved = assignDeliveries(db, { ...input([ready.id]), driverId: driver.id }, "Operator")[0];
  saveDriver(db, { ...driver, name: "Renamed Driver", active: false }, "Admin");
  assert.equal(deliveryFor(db, ready.id)?.driverName, "Test Driver");
  assert.equal(deliveryFor(db, ready.id)?.driverPhone, "01234");
  assert.deepEqual(deliveryFor(db, ready.id), saved);
  assert.throws(() => assignDeliveries(db, { ...input([ready.id]), targets: [{ dispatchId: ready.id, version: 1 }], driverId: driver.id }, "Admin"), /active driver/);
});

test("bulk assignment is atomic and rejects stale, cancelled, draft, invalid-date or foreign-driver selections", () => {
  const db = seedDatabase(); const a = saveDispatch(db, packed(db), "Operator", "manifest"); const b = saveDispatch(db, packed(db), "Operator", "manifest");
  const draft = db.dispatches.find(d => d.status === "Draft")!;
  for (const bad of [input([]), input([a.id, a.id]), input([a.id, "missing"]), input([a.id, draft.id]), { ...input([a.id]), driverId: "another-laundry-driver" }, { ...input([a.id]), scheduledDate: "2026-02-30" }]) {
    const before = clone(db); assert.throws(() => assignDeliveries(db, bad, "Operator")); assert.deepEqual(db, before);
  }
  assert.throws(() => assignDeliveries(db, input([a.id]), "SystemsAdministrator"), /owner or operator/);
  const manifests = clone(db.dispatches);
  const assigned = assignDeliveries(db, input([a.id, b.id]), "Operator");
  assert.equal(assigned.length, 2); assert.equal(db.deliveryAssignments!.length, 2);
  assert.deepEqual(db.dispatches, manifests); // Assignment never changes a locked document or its status.
  const before = clone(db);
  assert.throws(() => assignDeliveries(db, { ...input([a.id, b.id]), targets: [{ dispatchId: a.id, version: 1 }, { dispatchId: b.id, version: 0 }] }, "Admin"), /another tab/);
  assert.deepEqual(db, before);
  const reassigned = assignDeliveries(db, { ...input([a.id]), driverId: "driver-pm", route: "PM-01", targets: [{ dispatchId: a.id, version: 1 }] }, "Admin")[0];
  assert.equal(reassigned.version, 2); assert.equal(reassigned.driverId, "driver-pm"); assert.equal(db.deliveryAssignments!.length, 2);
  cancelDispatch(db, a.id, "Customer postponed", "Admin");
  assert.ok(!deliveryRecords(db).some(d => d.id === a.id));
  assert.ok(deliveryFor(db, a.id)); // History remains available on the cancelled record.
  assert.ok(!operational(db, true).some(d => d.id === a.id)); // A cancelled ready manifest was never dispatched.
  const cancelled = clone(db);
  assert.throws(() => assignDeliveries(db, { ...input([a.id]), targets: [{ dispatchId: a.id, version: 2 }] }, "Operator"), /no longer available/);
  assert.deepEqual(db, cancelled);
});

test("legacy browser data migrates without adding drivers or mixing laundry workspaces; assignments persist separately", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage"); const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) } });
  try {
    const old = seedDatabase(); delete old.drivers; delete old.deliveryAssignments;
    const original = clone(old.dispatches); storage.set(STORAGE_KEY, JSON.stringify(old));
    const migrated = localRepository.load(); assert.deepEqual(migrated.dispatches, original); assert.deepEqual(migrated.drivers, []);
    localRepository.update(db => { saveDriver(db, { id: "driver-am", name: "Local Driver", phone: "", vehicle: "Van", active: true }, "Admin"); });
    const ready = localRepository.update(db => saveDispatch(db, packed(db), "Operator", "manifest")).result;
    const doc = renderToStaticMarkup(createElement(ManifestDocument, { db: localRepository.load(), record: ready }));
    assert.match(doc, /Ready for delivery/);
    localRepository.update(db => assignDeliveries(db, input([ready.id]), "Operator"));
    const loaded = localRepository.load(); assert.equal(deliveryFor(loaded, ready.id)?.driverName, "Local Driver");
    assert.equal(renderToStaticMarkup(createElement(ManifestDocument, { db: loaded, record: loaded.dispatches.find(d => d.id === ready.id)! })), doc);
    assert.deepEqual(inspectLaundry(loaded, "harbour", "SystemsAdministrator").drivers, []);
    assert.deepEqual(inspectLaundry(loaded, "harbour", "SystemsAdministrator").deliveryAssignments, []);
    const other = loaded.laundryWorkspaces!.harbour;
    other.drivers = [{ ...loaded.drivers![0], name: "Harbour-only Driver" }];
    other.deliveryAssignments = [{ ...loaded.deliveryAssignments![0], driverName: "Harbour-only Driver" }];
    const view = inspectLaundry(loaded, "harbour", "SystemsAdministrator");
    assert.equal(view.drivers![0].name, "Harbour-only Driver"); assert.equal(view.deliveryAssignments![0].driverName, "Harbour-only Driver");
    assert.equal(loaded.drivers![0].name, "Local Driver"); view.drivers![0].name = "Attempted edit";
    assert.equal(other.drivers[0].name, "Harbour-only Driver");
  } finally { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage"); }
});
