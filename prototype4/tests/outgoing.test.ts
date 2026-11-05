import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seedDatabase } from "../lib/seed";
import { cancelDispatch, clone, filterDispatches, emptyFilters, newCart, newDispatch, normalizeLine, saveDispatch, totals } from "../lib/domain";
import { convertOutgoingCartUnit, nextOutgoingCartNumber, outgoingCartNumber } from "../lib/outgoing";
import DispatchEditor from "../components/DispatchEditor";
import { ManifestDocument } from "../components/Manifest";

function packed(db = seedDatabase()) {
  const draft = newDispatch(db, "Demo Operator");
  draft.customerId = "alexandra"; draft.siteId = "alex-main";
  draft.carts[0].lines = [normalizeLine({ id: "own-pillow", itemId: "pillow", code: "PC-001", description: "White pillowcase", ownership: "customer", ownerCustomerId: "alexandra", quantity: 25, unit: "pieces", bundleSize: null, equivalentPieces: null })];
  return draft;
}

test("outgoing cart numbering allocates on save, survives reload and cancellation, and preserves legacy references", () => {
  const db = seedDatabase(); const before = clone(db); const start = nextOutgoingCartNumber(db);
  const draft = packed(db); draft.carts.push(newCart());
  assert.equal(outgoingCartNumber(db, draft, draft.carts[0]), String(start));
  assert.equal(outgoingCartNumber(db, draft, draft.carts[1]), String(start + 1));
  assert.deepEqual(db, before); // Opening or abandoning a cart does not consume a number.
  assert.throws(() => saveDispatch(db, { ...draft, customerId: "missing" }, "Operator", false));
  assert.equal(nextOutgoingCartNumber(db), start);
  const saved = saveDispatch(db, draft, "Operator", false);
  assert.deepEqual(saved.carts.map(c => c.reference), [String(start), String(start + 1)]);
  const removed = clone(db);
  const withoutLastCart = { ...saved, carts: [saved.carts[0]] };
  saveDispatch(removed, withoutLastCart, "Operator", false);
  assert.equal(nextOutgoingCartNumber(removed), start + 2); // Removing a saved cart never reuses its number.
  const reloaded = JSON.parse(JSON.stringify(db));
  const updated = saveDispatch(reloaded, saved, "Operator", false);
  assert.deepEqual(updated.carts.map(c => c.reference), saved.carts.map(c => c.reference));
  updated.carts[1].lines = clone(updated.carts[0].lines).map(l => ({ ...l, id: "second-line" }));
  const confirmed = saveDispatch(reloaded, updated, "Operator", true);
  assert.deepEqual(saveDispatch(reloaded, updated, "Operator", true), confirmed);
  cancelDispatch(reloaded, confirmed.id, "Test cancellation", "Admin");
  assert.equal(saveDispatch(reloaded, packed(reloaded), "Operator", false).carts[0].reference, String(start + 2));
  assert.equal(reloaded.dispatches.find((d: { id: string }) => d.id === db.dispatches[1].id)?.carts[0].reference, db.dispatches[1].carts[0].reference);
  const match = filterDispatches(reloaded.dispatches, { ...emptyFilters, cartReference: String(start + 2) });
  assert.equal(match.length, 1);
});

test("outgoing cart weighing converts physical units without changing linen quantities", () => {
  const cart = packed().carts[0]; cart.tare = 10; cart.gross = 30; cart.comments = "Top shelf";
  const before = clone(cart);
  const lb = convertOutgoingCartUnit(cart, "lb");
  assert.ok(Math.abs(lb.gross! - 66.13867865) < 0.000001);
  assert.ok(Math.abs((lb.gross! - lb.tare!) - 44.09245244) < 0.000001);
  assert.deepEqual(lb.lines, cart.lines);
  const kg = convertOutgoingCartUnit(lb, "kg");
  assert.ok(Math.abs(kg.tare! - 10) < 0.000001);
  assert.ok(Math.abs(kg.gross! - 30) < 0.000001);
  assert.equal(kg.comments, "Top shelf"); assert.deepEqual(cart, before);
  assert.equal(convertOutgoingCartUnit(newCart(), "lb").gross, null);
});

test("Linen Out renders touch cart entry, then saved cart details stay immutable in its manifest", () => {
  const db = seedDatabase(); const draft = packed(db);
  const html = renderToStaticMarkup(createElement(DispatchEditor, { db, draft, onChange() {}, onSave() { return undefined; }, onOpen() {}, onPreview() {}, onBack() {} }));
  assert.match(html, /Create Outgoing Carts/); assert.match(html, /Cart Number \(Auto\)/);
  assert.match(html, /Create Manifest/); assert.match(html, /Save &amp; Print/);
  assert.match(html, /<output[^>]*aria-label="Outgoing cart number"/);
  assert.equal(db.dispatches.some(d => d.id === draft.id), false);
  const saved = saveDispatch(db, draft, "Operator", false);
  const preview = renderToStaticMarkup(createElement(ManifestDocument, { db, record: saved }));
  assert.match(preview, /NOT DISPATCHED/);
  assert.equal(totals(db.dispatches.filter(d => d.status === "Dispatched")).pieces, 190);
  const confirmed = saveDispatch(db, saved, "Operator", true);
  const document = renderToStaticMarkup(createElement(ManifestDocument, { db, record: confirmed }));
  db.company.name = "Changed company"; db.items[0].name = "Changed item";
  assert.equal(renderToStaticMarkup(createElement(ManifestDocument, { db, record: confirmed })), document);
  assert.match(document, new RegExp(`Ref: ${confirmed.carts[0].reference}`));
  assert.equal(totals(db.dispatches.filter(d => d.status === "Dispatched")).pieces, 215);
});
