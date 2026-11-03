import test from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../lib/seed";
import { LIVE_LAUNDRY_ID, laundryStats, saveLaundry, saveUser, setLaundryStatus, setUserActive } from "../lib/platform";
import { uid } from "../lib/domain";

test("seed includes three laundries and mixed user roles", () => {
  const db = seedDatabase();
  assert.equal(db.laundries?.length, 3);
  assert.ok(db.users?.some(u => u.role === "SystemsAdministrator"));
  assert.ok(db.users?.some(u => u.role === "Admin" && u.laundryId === LIVE_LAUNDRY_ID));
  assert.ok(db.users?.some(u => u.role === "Operator"));
});

test("live laundry stats come from operational records", () => {
  const db = seedDatabase();
  const live = db.laundries!.find(l => l.id === LIVE_LAUNDRY_ID)!;
  const stats = laundryStats(db, live);
  assert.equal(stats.customers, db.customers.filter(c => c.active).length);
  assert.equal(stats.dispatches, db.dispatches.length);
});

test("only a Systems Administrator can create users and laundries", () => {
  const db = seedDatabase();
  assert.throws(() => saveUser(db, { id: uid(), name: "Pat", email: "pat@example.com", phone: "", laundryId: LIVE_LAUNDRY_ID, role: "Operator", active: true }, "Admin"), /Systems Administrator/);
  assert.throws(() => saveLaundry(db, { id: uid(), code: "XX1", name: "Extra Wash", city: "Negombo", contact: "", email: "", phone: "", status: "trial", plan: "trial" }, "Operator"), /Systems Administrator/);
});

test("user email is unique and staff must belong to a laundry", () => {
  const db = seedDatabase();
  assert.throws(() => saveUser(db, { id: uid(), name: "Copy", email: "maya@purelinen.example", phone: "", laundryId: LIVE_LAUNDRY_ID, role: "Operator", active: true }, "SystemsAdministrator"), /unique/);
  assert.throws(() => saveUser(db, { id: uid(), name: "No Site", email: "none@example.com", phone: "", laundryId: null, role: "Operator", active: true }, "SystemsAdministrator"), /laundry/);
});

test("deactivating the last Systems Administrator is blocked", () => {
  const db = seedDatabase();
  const extra = saveUser(db, { id: uid(), name: "Second SA", email: "sa2@purelinen.example", phone: "", laundryId: null, role: "SystemsAdministrator", active: true }, "SystemsAdministrator");
  setUserActive(db, extra.id, false, "SystemsAdministrator");
  assert.equal(db.users!.find(u => u.id === extra.id)?.active, false);
  const last = db.users!.find(u => u.role === "SystemsAdministrator" && u.active)!;
  assert.throws(() => setUserActive(db, last.id, false, "SystemsAdministrator"), /at least one/);
});

test("laundry suspend is recorded on the platform audit log", () => {
  const db = seedDatabase();
  assert.throws(() => setLaundryStatus(db, "harbour", "suspended", "SystemsAdministrator"), /reason/);
  setLaundryStatus(db, "harbour", "suspended", "SystemsAdministrator", "Contract paused");
  assert.equal(db.laundries!.find(l => l.id === "harbour")?.status, "suspended");
  assert.equal(db.activity[0].scope, "platform");
  assert.match(db.activity[0].detail, /Harbour Wash/);
});
