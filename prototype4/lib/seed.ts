import type { Database, Dispatch, Line, Ownership, Unit } from "./types";
import { cancelDispatch, clone, newDispatch, normalizeLine, saveDispatch, today, uid } from "./domain";

export function seedDatabase(): Database {
  const db: Database = {
    schemaVersion: 1, nextNumber: 1001,
    company: { name: "Pure Linen Laundry", address: "25 Laundry Lane, Colombo, Sri Lanka", phone: "+94 11 555 0100", email: "dispatch@purelinen.example", website: "www.purelinen.example", logo: "", defaultWeightUnit: "kg" },
    customers: [
      { id: "alexandra", code: "AH001", name: "Alexandra Hotel", contact: "N. Perera", phone: "+94 11 555 0101", email: "housekeeping@alexandra.example", active: true },
      { id: "blueview", code: "BV002", name: "Blue View Hotel", contact: "S. Fernando", phone: "+94 11 555 0102", email: "linen@blueview.example", active: true },
      { id: "riverside", code: "RR003", name: "Riverside Restaurant", contact: "A. Silva", phone: "+94 11 555 0103", email: "manager@riverside.example", active: true },
    ],
    sites: [
      { id: "alex-main", customerId: "alexandra", name: "Main Hotel", department: "Housekeeping", address: "18 Alexandra Road, Colombo 03", route: "AM-01", active: true },
      { id: "alex-banquet", customerId: "alexandra", name: "Banquet Wing", department: "Food & Beverage", address: "20 Alexandra Road, Colombo 03", route: "AM-01", active: true },
      { id: "blue-main", customerId: "blueview", name: "Ocean Wing", department: "Housekeeping", address: "42 Marine Drive, Colombo 04", route: "AM-02", active: true },
      { id: "river-main", customerId: "riverside", name: "Main Restaurant", department: "Kitchen", address: "7 River Road, Colombo 02", route: "PM-01", active: true },
    ],
    categories: ["Bedding", "Towels", "Kitchen", "Restaurant Linen", "Other"].map(name => ({ id: name, name, active: true })),
    items: [
      { id: "pillow", code: "PC-001", name: "White pillowcase", categoryId: "Bedding", methods: ["pieces", "bundles"], defaultMethod: "pieces", bundleSize: 10, image: "", active: true },
      { id: "sheet", code: "SH-001", name: "King flat sheet", categoryId: "Bedding", methods: ["pieces", "bundles"], defaultMethod: "bundles", bundleSize: 5, image: "", active: true },
      { id: "towel", code: "BT-001", name: "Bath towel", categoryId: "Towels", methods: ["pieces", "bundles"], defaultMethod: "pieces", bundleSize: 10, image: "", active: true },
      { id: "mat", code: "BM-001", name: "Bath mat", categoryId: "Towels", methods: ["pieces", "bundles"], defaultMethod: "pieces", bundleSize: 10, image: "", active: true },
      { id: "table", code: "TL-001", name: "Table linen", categoryId: "Restaurant Linen", methods: ["pieces", "bundles", "weight"], defaultMethod: "weight", bundleSize: 10, image: "", active: true },
      { id: "kitchen", code: "KT-001", name: "Kitchen cloth", categoryId: "Kitchen", methods: ["pieces", "weight"], defaultMethod: "pieces", bundleSize: null, image: "", active: true },
    ],
    assignments: [], dispatches: [], activity: [],
  };
  for (const customer of db.customers) for (const item of db.items) db.assignments.push({ id: uid(), itemId: item.id, customerId: customer.id, ownership: "customer", active: true });
  for (const item of db.items) db.assignments.push({ id: uid(), itemId: item.id, customerId: null, ownership: "pool", active: true });
  const line = (itemId: string, ownership: Ownership, quantity: number, unit: Unit, customerId = "alexandra"): Line => {
    const item = db.items.find(i => i.id === itemId)!;
    return normalizeLine({ id: uid(), itemId, code: item.code, description: item.name, ownership, ownerCustomerId: ownership === "customer" ? customerId : null, quantity, unit, bundleSize: unit === "bundles" ? item.bundleSize : null, equivalentPieces: null });
  };
  const mixed = newDispatch(db, "Demo Operator");
  mixed.customerId = "alexandra"; mixed.siteId = "alex-main"; mixed.route = "AM-01";
  mixed.notes = "Mixed ownership demonstration. Table linen is measured by weight.";
  mixed.carts[0] = { ...mixed.carts[0], reference: "01", tare: 18, gross: 62, lines: [line("pillow", "customer", 100, "pieces"), line("pillow", "pool", 5, "bundles"), line("towel", "pool", 40, "pieces")] };
  mixed.carts.push({ id: uid(), reference: "02", comments: "Table linen", tare: 16, gross: 28.5, weightUnit: "kg", lines: [line("table", "customer", 12.5, "kg")] });
  saveDispatch(db, mixed, "Operator", true);
  const draft = newDispatch(db, "Demo Operator");
  draft.customerId = "blueview"; draft.siteId = "blue-main"; draft.route = "AM-02";
  draft.carts[0].reference = "BV-17"; draft.carts[0].lines = [line("sheet", "customer", 3, "bundles", "blueview"), line("mat", "pool", 20, "pieces", "blueview")];
  saveDispatch(db, draft, "Operator", false);
  const cancelled: Dispatch = clone(newDispatch(db, "Demo Operator"));
  cancelled.customerId = "riverside"; cancelled.siteId = "river-main"; cancelled.shippingDate = today();
  cancelled.carts[0].reference = "RR-03"; cancelled.carts[0].lines = [line("table", "pool", 8, "kg", "riverside")];
  const saved = saveDispatch(db, cancelled, "Operator", true);
  cancelDispatch(db, saved.id, "Customer rescheduled delivery; linen did not leave on this document.", "Admin");
  return db;
}
