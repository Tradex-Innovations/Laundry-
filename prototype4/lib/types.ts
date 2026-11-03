export type Role = "Admin" | "Operator" | "SystemsAdministrator";
export type LaundryStatus = "active" | "trial" | "suspended";
export type LaundryPlan = "trial" | "standard" | "premium";
export type Ownership = "customer" | "pool";
export type Method = "pieces" | "bundles" | "weight";
export type WeightUnit = "kg" | "lb";
export type Unit = "pieces" | "bundles" | WeightUnit;
export type Status = "Draft" | "Dispatched" | "Cancelled";

export interface Customer {
  id: string; code: string; name: string; contact: string; phone: string; email: string; active: boolean;
}
export interface Site {
  id: string; customerId: string; name: string; department: string; address: string; route: string; active: boolean;
}
export interface Category { id: string; name: string; active: boolean }
export interface Item {
  id: string; code: string; name: string; categoryId: string; methods: Method[];
  defaultMethod: Method; bundleSize: number | null; image: string; active: boolean;
}
export interface Assignment {
  id: string; itemId: string; ownership: Ownership; customerId: string | null; active: boolean;
}
export interface Line {
  id: string; itemId: string; code: string; description: string; ownership: Ownership;
  ownerCustomerId: string | null; quantity: number; unit: Unit; bundleSize: number | null;
  equivalentPieces: number | null;
}
export interface Cart {
  id: string; reference: string; comments: string; tare: number | null; gross: number | null;
  weightUnit: WeightUnit; lines: Line[];
}
export interface Company {
  name: string; address: string; phone: string; email: string; website: string;
  logo: string; defaultWeightUnit: WeightUnit;
}
export interface DocumentSnapshot {
  customer: Customer; site: Site; company: Company; createdBy: string;
}
export interface Dispatch {
  id: string; number: string; customerId: string; siteId: string; shippingDate: string;
  route: string; notes: string; status: Status; carts: Cart[]; createdAt: string; updatedAt: string;
  createdBy: string; confirmedAt: string | null; cancelledAt: string | null; cancellationReason: string;
  snapshot: DocumentSnapshot | null; version: number;
}
export interface Activity {
  id: string; at: string; actor: string; action: string; detail: string; dispatchId?: string; laundryId?: string; scope?: "platform";
}
export interface LaundrySnapshot { customers: number; sites: number; items: number; dispatches: number; receipts: number }
export interface Laundry {
  id: string; code: string; name: string; legalName: string; city: string; address: string; contact: string;
  email: string; phone: string; website: string; logo: string; status: LaundryStatus; plan: LaundryPlan;
  goLiveDate: string; planEndsOn: string; suspendReason: string; defaultWeightUnit: WeightUnit;
  timezone: string; numberPrefix: string; createdAt: string; snapshot: LaundrySnapshot;
}
export interface PlatformUser {
  id: string; name: string; email: string; phone: string; laundryId: string | null;
  role: Role; active: boolean; lastSignIn: string | null;
}
export interface ReceivingInput {
  id: string; customerId: string; siteId: string; receivedDate: string; containers: number;
  pieces: number; weightKg: number; reference: string; notes: string;
}
export interface Receipt extends ReceivingInput {
  number: string; createdAt: string; createdBy: string; customerName: string; siteName: string;
}
export interface LaundryWorkspace {
  nextNumber: number; company: Company; customers: Customer[]; sites: Site[]; categories: Category[];
  items: Item[]; assignments: Assignment[]; dispatches: Dispatch[]; receipts: Receipt[]; activity: Activity[];
}
export interface Database {
  schemaVersion: 1; nextNumber: number; customers: Customer[]; sites: Site[]; categories: Category[];
  items: Item[]; assignments: Assignment[]; dispatches: Dispatch[]; company: Company; activity: Activity[];
  receipts?: Receipt[]; laundries?: Laundry[]; users?: PlatformUser[];
  laundryWorkspaces?: Record<string, LaundryWorkspace>;
}
export interface Totals {
  customerPieces: number; poolPieces: number; pieces: number;
  weights: Record<WeightUnit, number>;
  ownershipWeights: Record<Ownership, Record<WeightUnit, number>>;
  carts: number; weighedCarts: number;
  cartWeights: Record<WeightUnit, { tare: number; gross: number; net: number; count: number }>;
}
export interface Filters {
  customerId: string; from: string; to: string; status: string; number: string; cartReference: string;
}
