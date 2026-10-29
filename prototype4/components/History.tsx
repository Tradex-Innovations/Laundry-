"use client";
import { useState } from "react";
import { ArrowUpRight, FileText, Printer } from "lucide-react";
import type { Database, Dispatch, Filters, Role } from "../lib/types";
import { emptyFilters, filterDispatches, fmt, totals } from "../lib/domain";
import { Dialog, Field, QuantitySummary, StatusBadge } from "./shared";
import { LineTable } from "./DispatchEditor";

export function DispatchFilters({ db, value, onChange, status = true }: { db: Database; value: Filters; onChange: (value: Filters) => void; status?: boolean }) {
  const set = (key: keyof Filters, v: string) => onChange({ ...value, [key]: v });
  return <fieldset className="lg:!grid-cols-3 xl:!grid-cols-4"><legend>Filters</legend>
    <Field label="Customer filter"><select value={value.customerId} onChange={e => set("customerId", e.target.value)}><option value="">All customers</option>{db.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="Shipping date from"><input type="date" value={value.from} onChange={e => set("from", e.target.value)} /></Field>
    <Field label="Shipping date to"><input type="date" min={value.from} value={value.to} onChange={e => set("to", e.target.value)} /></Field>
    {value.from && value.to && value.from > value.to && <p role="alert">The end date must be on or after the start date.</p>}
    {status && <Field label="Status filter"><select value={value.status} onChange={e => set("status", e.target.value)}><option value="">All statuses</option><option>Draft</option><option>Dispatched</option><option>Cancelled</option></select></Field>}
    <Field label="Dispatch number filter"><input value={value.number} onChange={e => set("number", e.target.value)} placeholder="LM-001001" /></Field>
    <Field label="Cart reference filter"><input value={value.cartReference} onChange={e => set("cartReference", e.target.value)} /></Field>
    <button onClick={() => onChange({ ...emptyFilters })}>Clear Filters</button>
  </fieldset>;
}

export function DispatchTable({ db, records, onOpen, onPreview, compact = false }: { db: Database; records: Dispatch[]; onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void; compact?: boolean }) {
  if (!records.length) return <div className="rounded-xl border border-dashed border-[#dce5d5] px-5 py-12 text-center"><FileText className="mx-auto mb-3 text-[#9da991]" size={28} /><p>No dispatches match. Create a dispatch or change the filters.</p></div>;
  return <div className="table-scroll"><table><thead><tr><th>Dispatch</th><th>Customer</th>{!compact && <th>Delivery site</th>}<th>Status</th><th>Carts</th><th>Pieces</th>{!compact && <th>Weight-based linen</th>}<th>Actions</th></tr></thead><tbody>{records.map(d => {
    const t = totals([d]); return <tr key={d.id}><td><span className="block whitespace-nowrap font-semibold text-[#506b51]">{d.number}</span><span className="mt-1 block text-[10px] text-[#9ba38f]">{d.shippingDate}</span></td><td><span className="block whitespace-nowrap text-xs font-medium">{d.snapshot?.customer.name || db.customers.find(c => c.id === d.customerId)?.name}</span>{compact && <span className="mt-1 block text-[10px] text-[#9ba38f]">{d.snapshot?.site.name || db.sites.find(s => s.id === d.siteId)?.name}</span>}</td>{!compact && <td>{d.snapshot?.site.name || db.sites.find(s => s.id === d.siteId)?.name}</td>}<td><StatusBadge status={d.status} /></td><td><span className="font-medium">{d.carts.length}</span>{!compact && <span className="mt-1 block text-[10px] text-[#9ba38f]">{d.carts.map(c => c.reference || "No reference").join(", ")}</span>}</td><td className="font-medium">{fmt(t.pieces)}</td>{!compact && <td className="whitespace-nowrap">{fmt(t.weights.kg)} kg; {fmt(t.weights.lb)} lb</td>}<td><div className="flex gap-1"><button aria-label={`${d.status === "Draft" ? "Resume draft" : "Open record"} ${d.number}`} title={d.status === "Draft" ? "Resume draft" : "Open record"} className="!border-transparent !bg-[#f0f4ea] !text-[#6a8360]" onClick={() => onOpen(d)}>{!compact && (d.status === "Draft" ? "Resume Draft" : "Open")}<ArrowUpRight size={14} /></button><button aria-label={`Print preview ${d.number}`} title="Print preview / Reprint" className="!border-transparent !bg-transparent !text-[#8b9a80]" onClick={() => onPreview(d)}><Printer size={14} />{!compact && (d.status === "Draft" ? "Preview" : "Reprint")}</button></div></td></tr>;
  })}</tbody></table></div>;
}
export default function History({ db, draftsOnly, onOpen, onPreview }: { db: Database; draftsOnly: boolean; onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void }) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const records = filterDispatches(db.dispatches.filter(d => !draftsOnly || d.status === "Draft"), { ...filters, ...(draftsOnly ? { status: "Draft" } : {}) });
  return <section><h1 className="!mb-2">{draftsOnly ? "Draft Dispatches" : "Dispatch History"}</h1><p className="!mt-0 !text-xs">{draftsOnly ? "Pick up a saved dispatch and get your linen ready to go." : "A clear record of every dispatch. Find, review, and reprint in a few clicks."}</p><DispatchFilters db={db} value={filters} onChange={setFilters} status={!draftsOnly} /><p className="!text-xs">{records.length} matching records</p><DispatchTable db={db} records={records} onOpen={onOpen} onPreview={onPreview} /></section>;
}

export function RecordView({ db, record, role, onPreview, onCancel }: { db: Database; record: Dispatch; role: Role; onPreview: (record: Dispatch) => void; onCancel: (id: string, reason: string) => boolean }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  return <section><div className="flex flex-wrap items-start justify-between gap-3"><h1>{record.number}</h1><StatusBadge status={record.status} /></div>
    <p>{record.snapshot?.customer.code} · {record.snapshot?.customer.name}<br />{record.snapshot?.site.name} · {record.snapshot?.site.department}<br />{record.snapshot?.site.address}<br />Shipping date: {record.shippingDate}</p>
    <p>Created by {record.createdBy} · Confirmed {record.confirmedAt ? new Date(record.confirmedAt).toLocaleString() : "—"}</p>
    <p>Route/reference: {record.route || "—"}<br />Notes: {record.notes || "—"}</p>
    {record.status === "Cancelled" && <p role="status"><strong>Cancellation reason:</strong> {record.cancellationReason}<br />Cancelled {record.cancelledAt ? new Date(record.cancelledAt).toLocaleString() : ""}. Excluded from operational totals by default.</p>}
    <p className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => onPreview(record)}><Printer size={15} />Print Preview / Reprint</button>{role === "Admin" && record.status === "Dispatched" && <button className="btn-danger" onClick={() => setCancelling(true)}>Cancel Dispatch</button>}</p>
    {record.carts.map((cart, index) => <section key={cart.id}><h2>Cart {index + 1} · {cart.reference || "No reference"}</h2><p>System ID: <code>{cart.id}</code><br />{cart.comments}</p><LineTable cart={cart} />{cart.tare !== null && cart.gross !== null && <p>Tare: {fmt(cart.tare)} {cart.weightUnit} · Gross: {fmt(cart.gross)} {cart.weightUnit} · Net: {fmt(cart.gross - cart.tare)} {cart.weightUnit}</p>}</section>)}
    <h2>Dispatch summary</h2><QuantitySummary records={[record]} />
    {role === "Admin" && <><h2>Activity history</h2><ul>{db.activity.filter(a => a.dispatchId === record.id).map(a => <li key={a.id}>{new Date(a.at).toLocaleString()} · {a.actor} · {a.action} · {a.detail}</li>)}</ul></>}
    {cancelling && <Dialog title={`Cancel ${record.number}`} onClose={() => setCancelling(false)}><p>The original dispatch and manifest will remain available. Operational report totals will exclude this dispatch.</p><form onSubmit={e => { e.preventDefault(); if (onCancel(record.id, reason)) { setCancelling(false); setReason(""); } }}><Field label="Cancellation reason *"><textarea required minLength={1} value={reason} onChange={e => setReason(e.target.value)} /></Field><button type="submit">Confirm Cancellation</button></form></Dialog>}
  </section>;
}
