import type { Database, DeliveryAssignment, Driver, Role } from "./types";
import { clone, log } from "./domain";

export interface DeliveryTarget { dispatchId: string; version: number }
export interface DeliveryInput { targets: DeliveryTarget[]; driverId: string; route: string; scheduledDate: string }
export const deliveryRecords = (db: Database) => db.dispatches.filter(d => d.status === "Ready" || d.status === "Dispatched");
export const deliveryFor = (db: Database, dispatchId: string) => db.deliveryAssignments?.find(a => a.dispatchId === dispatchId);

export function ensureDeliveryData(db: Database): boolean {
  let changed = false;
  for (const data of [db, ...Object.values(db.laundryWorkspaces || {})]) {
    if (data.drivers === undefined) { data.drivers = []; changed = true; }
    if (data.deliveryAssignments === undefined) { data.deliveryAssignments = []; changed = true; }
  }
  return changed;
}
export function saveDriver(db: Database, input: Driver, role: Role): Driver {
  if (role !== "Admin") throw new Error("Only the laundry owner can manage drivers.");
  const driver = { ...clone(input), name: input.name.trim(), phone: input.phone.trim(), vehicle: input.vehicle.trim() };
  if (!driver.id || driver.name.length < 2) throw new Error("Enter a driver name with at least two characters.");
  if (db.drivers?.some(d => d.id !== driver.id && d.name.toLowerCase() === driver.name.toLowerCase())) throw new Error("A driver with this name already exists.");
  db.drivers ??= [];
  const index = db.drivers.findIndex(d => d.id === driver.id);
  if (index < 0) db.drivers.push(driver); else db.drivers[index] = driver;
  log(db, role, index < 0 ? "Driver created" : "Driver updated", `${driver.name} · ${driver.active ? "Active" : "Inactive"}`);
  return clone(driver);
}
export function assignDeliveries(db: Database, input: DeliveryInput, role: Role): DeliveryAssignment[] {
  if (role === "SystemsAdministrator") throw new Error("Use a laundry owner or operator role to assign deliveries.");
  if (!input.targets.length) throw new Error("Select at least one delivery.");
  if (new Set(input.targets.map(t => t.dispatchId)).size !== input.targets.length) throw new Error("Each delivery can be selected only once.");
  const driver = db.drivers?.find(d => d.id === input.driverId && d.active);
  if (!driver) throw new Error("Select an active driver belonging to this laundry.");
  const date = new Date(input.scheduledDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.scheduledDate) throw new Error("Enter a valid delivery date.");
  // Validate every target before changing any assignment (including bulk operations).
  const records = input.targets.map(target => {
    const record = db.dispatches.find(d => d.id === target.dispatchId);
    if (!record || !["Ready", "Dispatched"].includes(record.status)) throw new Error("A selected delivery is no longer available. Refresh the delivery list.");
    const existing = deliveryFor(db, record.id);
    if (!Number.isSafeInteger(target.version) || target.version !== (existing?.version || 0)) throw new Error(`${record.number}: the assignment changed in another tab. Reopen it before saving.`);
    return { record, existing };
  });
  const now = new Date().toISOString();
  const saved = records.map(({ record, existing }) => ({ dispatchId: record.id, driverId: driver.id,
    driverName: driver.name, driverPhone: driver.phone, vehicle: driver.vehicle,
    route: input.route.trim(), scheduledDate: input.scheduledDate, assignedAt: now, assignedBy: `Demo ${role}`, version: (existing?.version || 0) + 1 }));
  const ids = new Set(saved.map(a => a.dispatchId));
  db.deliveryAssignments = [...saved, ...(db.deliveryAssignments || []).filter(a => !ids.has(a.dispatchId))];
  for (const { record, existing } of records) log(db, role, existing ? "Delivery reassigned" : "Delivery assigned", `${record.number} · ${driver.name} · ${input.scheduledDate} · ${input.route.trim() || "No route"}`, record.id);
  return clone(saved);
}
