import type { Database, Laundry, LaundryWorkspace, Role } from "./types";
import { clone, totals } from "./domain";

export const LIVE_LAUNDRY_ID = "purelinen";

export function emptyLaundryWorkspace(laundry: Laundry): LaundryWorkspace {
  return {
    nextNumber: 1, nextOutgoingCartNumber: 1,
    company: { name: laundry.name, address: laundry.address, email: laundry.email, phone: laundry.phone,
      website: laundry.website, logo: laundry.logo, defaultWeightUnit: laundry.defaultWeightUnit },
    customers: [], sites: [], categories: [], items: [], assignments: [], dispatches: [], receipts: [], activity: [], drivers: [], deliveryAssignments: [],
  };
}

// The original operational collections remain canonical for Pure Linen. Other
// businesses have their own collections and never fall back to those records.
export function ensureLaundryWorkspaces(db: Database) {
  db.laundryWorkspaces ??= {};
  for (const laundry of db.laundries || []) {
    if (laundry.id !== LIVE_LAUNDRY_ID && !Object.hasOwn(db.laundryWorkspaces, laundry.id)) {
      Object.defineProperty(db.laundryWorkspaces, laundry.id, { value: emptyLaundryWorkspace(laundry), enumerable: true, writable: true, configurable: true });
    }
  }
}

function scopedData(db: Database, laundryId: string): LaundryWorkspace {
  const laundry = db.laundries?.find(l => l.id === laundryId);
  if (!laundry) throw new Error("Laundry not found.");
  if (laundryId === LIVE_LAUNDRY_ID) return {
    nextNumber: db.nextNumber, nextOutgoingCartNumber: db.nextOutgoingCartNumber, company: db.company, customers: db.customers, sites: db.sites,
    categories: db.categories, items: db.items, assignments: db.assignments, dispatches: db.dispatches,
    drivers: db.drivers || [], deliveryAssignments: db.deliveryAssignments || [],
    receipts: db.receipts || [], activity: db.activity.filter(a => a.scope !== "platform" && (!a.laundryId || a.laundryId === laundryId)),
  };
  return Object.hasOwn(db.laundryWorkspaces || {}, laundryId) ? db.laundryWorkspaces![laundryId] : emptyLaundryWorkspace(laundry);
}

export function laundryRecordCounts(db: Database, laundryId: string) {
  const data = scopedData(db, laundryId);
  return { customers: data.customers.filter(c => c.active).length, sites: data.sites.filter(s => s.active).length,
    items: data.items.filter(i => i.active).length, dispatches: data.dispatches.length, receipts: data.receipts.length };
}

export function inspectLaundry(db: Database, laundryId: string, role: Role): Database {
  if (role !== "SystemsAdministrator") throw new Error("Only a Systems Administrator can inspect a laundry workspace.");
  // Return a detached view without the platform directory or another laundry's data.
  return clone({ schemaVersion: 1, ...scopedData(db, laundryId) });
}

export function laundryInventory(data: Database) {
  return data.items.map(item => {
    const records = data.dispatches.filter(d => d.status === "Dispatched").map(d => ({ ...d,
      carts: d.carts.map(c => ({ ...c, lines: c.lines.filter(l => l.itemId === item.id) })),
    }));
    const incomingLines = (data.receipts || []).flatMap(r => (r.lines || []).filter(l => l.itemId === item.id).map(line => ({ line, unit: r.weightUnit || "kg" })));
    const received = { pieces: incomingLines.reduce((sum, entry) => sum + entry.line.quantity, 0), weights: { kg: 0, lb: 0 } };
    for (const entry of incomingLines) received.weights[entry.unit] += entry.line.weight || 0;
    return { item, received, assignments: data.assignments.filter(a => a.itemId === item.id), dispatched: totals(records) };
  });
}
