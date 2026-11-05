"use client";
import { useState } from "react";
import { CalendarDays, Check, ClipboardList, MapPin, PackageOpen, Printer, Truck, UserRound, UsersRound } from "lucide-react";
import type { Database, DeliveryAssignment, Dispatch, Role } from "../lib/types";
import { fmt, today, totals } from "../lib/domain";
import { assignDeliveries, deliveryFor, deliveryRecords, type DeliveryTarget } from "../lib/deliveries";
import { Dialog, Errors, Field, type Mutate } from "./shared";

function tomorrowDate() {
  const date = new Date(`${today()}T12:00:00`); date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DeliveryDetails({ assignment }: { assignment?: DeliveryAssignment }) {
  return <div className="delivery-details"><h3><Truck size={18} />Delivery assignment</h3>{assignment ? <><dl><div><dt>Driver</dt><dd>{assignment.driverName}</dd></div><div><dt>Scheduled date</dt><dd>{assignment.scheduledDate}</dd></div><div><dt>Route</dt><dd>{assignment.route || "No route"}</dd></div><div><dt>Phone</dt><dd>{assignment.driverPhone || "—"}</dd></div><div><dt>Vehicle</dt><dd>{assignment.vehicle || "—"}</dd></div><div><dt>Assigned by</dt><dd>{assignment.assignedBy}</dd></div></dl><p>Last assigned: {new Date(assignment.assignedAt).toLocaleString()}</p></> : <p>No driver assigned yet.</p>}</div>;
}
interface Props {
  db: Database; role: Role; mutate: Mutate; initialDispatchId?: string;
  onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void; onManageDrivers: () => void;
}
export default function DeliveryAssignments({ db, role, mutate, initialDispatchId, onOpen, onPreview, onManageDrivers }: Props) {
  const [period, setPeriod] = useState(initialDispatchId ? "all" : "today");
  const [date, setDate] = useState(today());
  const [route, setRoute] = useState("");
  const [driver, setDriver] = useState("");
  const [customer, setCustomer] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [targets, setTargets] = useState<DeliveryTarget[]>(() => initialDispatchId && deliveryRecords(db).some(d => d.id === initialDispatchId) ? [{ dispatchId: initialDispatchId, version: deliveryFor(db, initialDispatchId)?.version || 0 }] : []);
  const records = deliveryRecords(db);
  const name = (d: Dispatch) => d.snapshot?.customer.name || db.customers.find(c => c.id === d.customerId)?.name || "Unknown customer";
  const site = (d: Dispatch) => d.snapshot?.site.name || db.sites.find(s => s.id === d.siteId)?.name || "";
  const effectiveDate = (d: Dispatch) => deliveryFor(db, d.id)?.scheduledDate || d.shippingDate;
  const effectiveRoute = (d: Dispatch) => { const a = deliveryFor(db, d.id); return a ? a.route : d.route; };
  const tomorrow = tomorrowDate();
  const wantedDate = period === "today" ? today() : period === "tomorrow" ? tomorrow : period === "custom" ? date : "";
  const visible = records.filter(d => (!wantedDate || effectiveDate(d) === wantedDate) && (!route || effectiveRoute(d) === route) && (!customer || d.customerId === customer) && (!driver || (driver === "unassigned" ? !deliveryFor(db, d.id) : deliveryFor(db, d.id)?.driverId === driver)));
  const routes = [...new Set([...db.sites.map(s => s.route), ...records.map(effectiveRoute)].filter(Boolean))].sort();
  const customerOptions = [...new Map(records.map(d => [d.customerId, name(d)])).entries()];
  const driverOptions = [...new Map([...(db.drivers || []).map(d => [d.id, `${d.name}${d.active ? "" : " (inactive)"}`] as const), ...(db.deliveryAssignments || []).filter(a => !db.drivers?.some(d => d.id === a.driverId)).map(a => [a.driverId, `${a.driverName} (archived)`] as const)]).entries()];
  function filter(change: () => void) { change(); setSelected([]); }
  function open(ids: string[]) { setTargets(ids.map(dispatchId => ({ dispatchId, version: deliveryFor(db, dispatchId)?.version || 0 }))); }
  function toggle(id: string) { setSelected(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]); }
  return <section className="delivery-screen">
    <div className="delivery-heading"><div><h1>Assign Deliveries</h1><p>Assign prepared manifests to a driver and route.</p></div><div>{role === "Admin" && <button onClick={onManageDrivers}><UserRound size={17} />Drivers</button>}<button className={multiple ? "" : "btn-primary"} onClick={() => { setMultiple(!multiple); setSelected([]); }}><UsersRound size={17} />{multiple ? "Cancel selection" : "Assign Multiple"}</button></div></div>
    <div className="delivery-filters"><Field label="Schedule"><select aria-label="Delivery schedule filter" value={period} onChange={e => filter(() => setPeriod(e.target.value))}><option value="today">Due Today</option><option value="tomorrow">Due Tomorrow</option><option value="custom">Custom Date</option><option value="all">All Dates</option></select></Field>{period === "custom" && <Field label="Scheduled date"><input aria-label="Delivery filter date" type="date" value={date} onChange={e => filter(() => setDate(e.target.value))} /></Field>}<Field label="Route"><select aria-label="Delivery route filter" value={route} onChange={e => filter(() => setRoute(e.target.value))}><option value="">All Routes</option>{routes.map(r => <option key={r}>{r}</option>)}</select></Field><Field label="Driver"><select aria-label="Delivery driver filter" value={driver} onChange={e => filter(() => setDriver(e.target.value))}><option value="">All Drivers</option><option value="unassigned">Unassigned</option>{driverOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Customer"><select aria-label="Delivery customer filter" value={customer} onChange={e => filter(() => setCustomer(e.target.value))}><option value="">All Customers</option>{customerOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
    {!(db.drivers || []).some(d => d.active) && <div className="delivery-driver-notice"><UserRound size={19} /><span>{role === "Admin" ? "Add an active driver before assigning deliveries." : "Ask the laundry owner to add an active driver in Administration → Drivers."}</span>{role === "Admin" && <button onClick={onManageDrivers}>Manage drivers</button>}</div>}
    <div className="delivery-list-heading"><span>{visible.length} {visible.length === 1 ? "delivery" : "deliveries"}{wantedDate ? ` · ${wantedDate}` : ""}</span>{multiple && <div><button onClick={() => setSelected(visible.map(d => d.id))}>Select all visible</button><button className="btn-primary" disabled={!selected.length} onClick={() => open(selected.filter(id => visible.some(d => d.id === id)))}><Check size={17} />Assign selected ({selected.length})</button></div>}</div>
    <div className="delivery-card-grid">{visible.map(d => {
      const a = deliveryFor(db, d.id); const t = totals([d]); const inactive = a && !db.drivers?.some(driver => driver.id === a.driverId && driver.active);
      return <article key={d.id} className={`delivery-card ${selected.includes(d.id) ? "selected" : ""}`}><div className="delivery-card-heading">{multiple && <label className="delivery-select"><input aria-label={`Select delivery ${d.number}`} type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} /><span className="sr-only">Select delivery</span></label>}<div><h2>{name(d)}</h2><span>{site(d)}</span></div><span className={`delivery-assignment-badge ${a ? "assigned" : ""}`}>{a ? "Assigned" : "Unassigned"}</span></div><p className="delivery-document">{d.number} · {d.status === "Ready" ? "Ready for delivery" : "Dispatched"}</p><dl><div><dt><Truck size={16} />Driver</dt><dd>{a?.driverName || "Not assigned"}{inactive && <small>Inactive driver</small>}</dd></div><div><dt><MapPin size={16} />Route</dt><dd>{effectiveRoute(d) || "No route"}</dd></div><div><dt><PackageOpen size={16} />Carts</dt><dd>{d.carts.length} <small>· {fmt(t.pieces)} pieces</small></dd></div><div><dt><CalendarDays size={16} />Scheduled</dt><dd>{effectiveDate(d)}</dd></div></dl><div className="delivery-card-actions"><button className="btn-primary" aria-label={`${a ? "Reassign" : "Assign"} delivery ${d.number}`} onClick={() => open([d.id])}><UserRound size={17} />{a ? "Reassign Delivery" : "Assign Delivery"}</button><button aria-label={`View manifest ${d.number}`} onClick={() => onOpen(d)}><ClipboardList size={17} /></button><button aria-label={`Print manifest ${d.number}`} onClick={() => onPreview(d)}><Printer size={17} /></button></div></article>;
    })}</div>
    {!visible.length && <div className="delivery-empty"><Truck size={38} strokeWidth={1.4} /><h2>No deliveries match</h2><p>{records.length ? "Try All Dates or adjust the route, driver or customer filters." : "Save a shipping manifest from Linen Out to make it available here."}</p></div>}
    {!!targets.length && <AssignmentDialog key={targets.map(t => `${t.dispatchId}-${t.version}`).join("|")} db={db} targets={targets} role={role} mutate={mutate} routes={routes} onClose={() => setTargets([])} onSaved={() => { setTargets([]); setSelected([]); setMultiple(false); }} />}
  </section>;
}
function AssignmentDialog({ db, targets, role, mutate, routes, onClose, onSaved }: { db: Database; targets: DeliveryTarget[]; role: Role; mutate: Mutate; routes: string[]; onClose: () => void; onSaved: () => void }) {
  const first = db.dispatches.find(d => d.id === targets[0].dispatchId);
  const prior = first && deliveryFor(db, first.id);
  const [driverId, setDriverId] = useState(prior?.driverId || "");
  const [route, setRoute] = useState(prior ? prior.route : first?.route || "");
  const [date, setDate] = useState(prior?.scheduledDate || first?.shippingDate || today());
  const [errors, setErrors] = useState<string[]>([]);
  const active = (db.drivers || []).filter(d => d.active);
  return <Dialog title={targets.length > 1 ? `Assign ${targets.length} Deliveries` : prior ? "Reassign Delivery" : "Assign Delivery"} className="delivery-dialog" onClose={onClose}><p>{targets.map(t => { const d = db.dispatches.find(d => d.id === t.dispatchId); return d ? `${d.number} · ${d.snapshot?.customer.name || db.customers.find(c => c.id === d.customerId)?.name}` : "Unavailable delivery"; }).join("\n")}</p><form onSubmit={e => { e.preventDefault(); if (!driverId) { setErrors(["Select an active driver."]); return; } if (mutate(state => { assignDeliveries(state, { targets, driverId, route, scheduledDate: date }, role); }, `${targets.length} ${targets.length === 1 ? "delivery" : "deliveries"} assigned.`)) onSaved(); }}><Errors errors={errors} /><Field label="Driver *"><select autoFocus required aria-label="Assignment driver" value={driverId} onChange={e => setDriverId(e.target.value)}><option value="">Select Driver</option>{!active.some(d => d.id === driverId) && driverId && <option value={driverId} disabled>{prior?.driverName || "Unavailable driver"} (inactive)</option>}{active.map(d => <option key={d.id} value={d.id}>{d.name}{d.vehicle ? ` · ${d.vehicle}` : ""}</option>)}</select></Field><Field label="Route"><select aria-label="Assignment route" value={route} onChange={e => setRoute(e.target.value)}><option value="">No route</option>{[...new Set([...routes, route].filter(Boolean))].map(r => <option key={r}>{r}</option>)}</select></Field><Field label="Scheduled date *"><input required aria-label="Assignment scheduled date" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><div className="delivery-quick-dates"><button type="button" aria-pressed={date === today()} onClick={() => setDate(today())}>Today</button><button type="button" aria-pressed={date === tomorrowDate()} onClick={() => setDate(tomorrowDate())}>Tomorrow</button></div><p className="!text-xs">This saves the delivery assignment. The shipping manifest stays locked.</p><div className="delivery-dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary" disabled={!active.length}><Check size={17} />Save Assignment</button></div></form></Dialog>;
}
