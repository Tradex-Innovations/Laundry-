import type { Database, Laundry, LaundryPlan, LaundryStatus, PlatformUser, Role, WeightUnit } from "./types";
import { log, uid } from "./domain";

export const LIVE_LAUNDRY_ID = "purelinen";
const requirePlatform = (role: Role) => {
  if (role !== "SystemsAdministrator") throw new Error("Only a Systems Administrator can manage laundries and users.");
};
const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function logPlatform(db: Database, role: Role, action: string, detail: string, laundryId?: string) {
  log(db, role, action, detail);
  db.activity[0].scope = "platform";
  if (laundryId) db.activity[0].laundryId = laundryId;
}
export function normalizeLaundry(input: Partial<Laundry> & Pick<Laundry, "id" | "code" | "name">): Laundry {
  const name = input.name.trim();
  return {
    id: input.id, code: input.code.trim().toUpperCase(), name, legalName: (input.legalName || name).trim(),
    city: (input.city || "").trim(), address: (input.address || "").trim(), contact: (input.contact || "").trim(),
    email: (input.email || "").trim(), phone: (input.phone || "").trim(), website: (input.website || "").trim(),
    logo: input.logo || "", status: input.status || "trial", plan: input.plan || "trial",
    goLiveDate: input.goLiveDate || (input.createdAt || "").slice(0, 10), planEndsOn: input.planEndsOn || "",
    suspendReason: input.status === "suspended" ? (input.suspendReason || "").trim() : "",
    defaultWeightUnit: input.defaultWeightUnit || "kg", timezone: input.timezone || "Asia/Colombo",
    numberPrefix: (input.numberPrefix || input.code || "").trim().toUpperCase(),
    createdAt: input.createdAt || new Date().toISOString(),
    snapshot: input.snapshot || { customers: 0, sites: 0, items: 0, dispatches: 0, receipts: 0 },
  };
}
export function ensurePlatform(db: Database) {
  if (!db.laundries) db.laundries = [];
  if (!db.users) db.users = [];
  if (!db.laundries.length) db.laundries = [
    normalizeLaundry({ id: LIVE_LAUNDRY_ID, code: "PL001", name: "Pure Linen Laundry", legalName: "Pure Linen Laundry (Pvt) Ltd", city: "Colombo", address: "25 Laundry Lane, Colombo 03", contact: "N. Perera", email: "dispatch@purelinen.example", phone: "+94 11 555 0100", website: "www.purelinen.example", status: "active", plan: "standard", goLiveDate: "2026-01-12", planEndsOn: "2026-12-31", defaultWeightUnit: "kg", timezone: "Asia/Colombo", numberPrefix: "LM", createdAt: "2026-01-12T08:00:00.000Z", snapshot: { customers: 3, sites: 4, items: 6, dispatches: 3, receipts: 0 } }),
    normalizeLaundry({ id: "harbour", code: "HW002", name: "Harbour Wash", legalName: "Harbour Wash Services", city: "Galle", address: "12 Fort Road, Galle", contact: "F. De Silva", email: "ops@harbourwash.example", phone: "+94 91 555 0200", website: "www.harbourwash.example", status: "trial", plan: "trial", goLiveDate: "2026-09-03", planEndsOn: "2026-11-03", defaultWeightUnit: "kg", timezone: "Asia/Colombo", numberPrefix: "HW", createdAt: "2026-09-03T08:00:00.000Z", snapshot: { customers: 8, sites: 11, items: 18, dispatches: 42, receipts: 37 } }),
    normalizeLaundry({ id: "hillcountry", code: "HC003", name: "Hill Country Linen", legalName: "Hill Country Linen (Pvt) Ltd", city: "Kandy", address: "88 Peradeniya Road, Kandy", contact: "R. Wijesinghe", email: "office@hilllinen.example", phone: "+94 81 555 0300", website: "", status: "suspended", plan: "premium", goLiveDate: "2025-11-20", planEndsOn: "2026-11-20", suspendReason: "Contract paused at the client’s request.", defaultWeightUnit: "kg", timezone: "Asia/Colombo", numberPrefix: "HC", createdAt: "2025-11-20T08:00:00.000Z", snapshot: { customers: 14, sites: 19, items: 24, dispatches: 210, receipts: 188 } }),
  ];
  else db.laundries = db.laundries.map(l => normalizeLaundry(l));
  if (!db.users.length) db.users = [
    { id: "sys-maya", name: "Maya Jayasuriya", email: "maya@purelinen.example", phone: "+94 77 555 0001", laundryId: null, role: "SystemsAdministrator", active: true, lastSignIn: "2026-11-02T03:10:00.000Z" },
    { id: "pl-admin", name: "N. Perera", email: "n.perera@purelinen.example", phone: "+94 77 555 0101", laundryId: LIVE_LAUNDRY_ID, role: "Admin", active: true, lastSignIn: "2026-11-02T02:40:00.000Z" },
    { id: "pl-op", name: "Demo Operator", email: "operator@purelinen.example", phone: "+94 77 555 0102", laundryId: LIVE_LAUNDRY_ID, role: "Operator", active: true, lastSignIn: "2026-11-02T01:15:00.000Z" },
    { id: "hw-admin", name: "F. De Silva", email: "f.desilva@harbourwash.example", phone: "+94 77 555 0201", laundryId: "harbour", role: "Admin", active: true, lastSignIn: "2026-10-28T09:00:00.000Z" },
    { id: "hw-op", name: "K. Bandara", email: "k.bandara@harbourwash.example", phone: "+94 77 555 0202", laundryId: "harbour", role: "Operator", active: true, lastSignIn: "2026-10-28T08:20:00.000Z" },
    { id: "hc-admin", name: "R. Wijesinghe", email: "r.wijesinghe@hilllinen.example", phone: "+94 77 555 0301", laundryId: "hillcountry", role: "Admin", active: false, lastSignIn: "2026-08-14T11:00:00.000Z" },
  ];
}
export function laundryName(db: Database, laundryId: string | null) {
  if (!laundryId) return "Platform";
  return db.laundries?.find(l => l.id === laundryId)?.name || "Unknown laundry";
}
export function laundryStats(db: Database, laundry: Laundry) {
  if (laundry.id !== LIVE_LAUNDRY_ID) return { ...laundry.snapshot, users: (db.users || []).filter(u => u.laundryId === laundry.id).length };
  return {
    customers: db.customers.filter(c => c.active).length,
    sites: db.sites.filter(s => s.active).length,
    items: db.items.filter(i => i.active).length,
    dispatches: db.dispatches.length,
    receipts: (db.receipts || []).length,
    users: (db.users || []).filter(u => u.laundryId === laundry.id).length,
  };
}
export function laundryAudit(db: Database, laundryId: string) {
  const laundry = db.laundries?.find(l => l.id === laundryId);
  return db.activity.filter(a => a.scope === "platform" && (a.laundryId === laundryId || (!a.laundryId && laundry && a.detail.includes(laundry.name))));
}
export function saveLaundry(db: Database, input: Partial<Laundry> & Pick<Laundry, "id" | "code" | "name">, role: Role) {
  requirePlatform(role);
  if (!input.name.trim()) throw new Error("Laundry name is required.");
  if (!input.code.trim()) throw new Error("Laundry code is required.");
  const record = normalizeLaundry({ ...input, createdAt: db.laundries!.find(l => l.id === input.id)?.createdAt || input.createdAt });
  if (db.laundries!.some(l => l.id !== record.id && l.code.toLowerCase() === record.code.toLowerCase())) throw new Error("Laundry code must be unique.");
  const existing = db.laundries!.find(l => l.id === record.id);
  if (existing) {
    record.snapshot = existing.snapshot;
    Object.assign(existing, record);
  } else db.laundries!.push(record);
  logPlatform(db, role, existing ? "Laundry updated" : "Laundry created", record.name, record.id);
  return record;
}
export function setLaundryStatus(db: Database, id: string, status: LaundryStatus, role: Role, reason = "") {
  requirePlatform(role);
  const laundry = db.laundries!.find(l => l.id === id);
  if (!laundry) throw new Error("Laundry not found.");
  if (status === "suspended" && !reason.trim()) throw new Error("A reason is required to suspend a laundry.");
  laundry.status = status;
  laundry.suspendReason = status === "suspended" ? reason.trim() : "";
  logPlatform(db, role, "Laundry status changed", `${laundry.name} → ${status}${reason.trim() ? `: ${reason.trim()}` : ""}`, laundry.id);
}
export function saveUser(db: Database, input: Omit<PlatformUser, "lastSignIn"> & { lastSignIn?: string | null }, role: Role) {
  requirePlatform(role);
  const name = input.name.trim(); const email = input.email.trim().toLowerCase();
  if (!name) throw new Error("Name is required.");
  if (!emailOk(email)) throw new Error("Enter a valid email address.");
  if (input.role !== "SystemsAdministrator" && !input.laundryId) throw new Error("Assign this person to a laundry.");
  if (input.role === "SystemsAdministrator" && input.laundryId) throw new Error("A Systems Administrator is not assigned to one laundry.");
  if (input.laundryId && !db.laundries!.some(l => l.id === input.laundryId)) throw new Error("Select a valid laundry.");
  if (db.users!.some(u => u.id !== input.id && u.email === email)) throw new Error("Email must be unique.");
  const existing = db.users!.find(u => u.id === input.id);
  const record: PlatformUser = {
    id: input.id, name, email, phone: input.phone.trim(), laundryId: input.role === "SystemsAdministrator" ? null : input.laundryId,
    role: input.role, active: input.active, lastSignIn: existing?.lastSignIn ?? input.lastSignIn ?? null,
  };
  if (existing) Object.assign(existing, record); else db.users!.push(record);
  logPlatform(db, role, existing ? "User updated" : "User created", `${record.name} (${record.role})`, record.laundryId || undefined);
  return record;
}
export function setUserActive(db: Database, id: string, active: boolean, role: Role) {
  requirePlatform(role);
  const user = db.users!.find(u => u.id === id);
  if (!user) throw new Error("User not found.");
  if (user.role === "SystemsAdministrator" && !active && db.users!.filter(u => u.role === "SystemsAdministrator" && u.active).length < 2) {
    throw new Error("Keep at least one active Systems Administrator.");
  }
  user.active = active;
  logPlatform(db, role, active ? "User reactivated" : "User deactivated", user.name, user.laundryId || undefined);
}
export const laundryPlans: LaundryPlan[] = ["trial", "standard", "premium"];
export const laundryStatuses: LaundryStatus[] = ["active", "trial", "suspended"];
export const weightUnits: WeightUnit[] = ["kg", "lb"];
export const timezones = ["Asia/Colombo", "Asia/Dubai", "Europe/London", "UTC"];
