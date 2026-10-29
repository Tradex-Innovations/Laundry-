"use client";
import { useEffect, useRef } from "react";
import { AlertCircle, LockKeyhole, X } from "lucide-react";
import type { Database, Dispatch, Role } from "../lib/types";
import { fmt, totals } from "../lib/domain";

export type Mutate = (operation: (db: Database) => void, message: string) => boolean;
export interface MasterProps { db: Database; role: Role; mutate: Mutate }
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#e7ebe1] pb-5"><h2 className="!m-0 !text-xl">{title}</h2><button type="button" className="btn-quiet !size-8 !min-h-8 shrink-0 !p-0" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>{children}
  </dialog>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <p className="field"><label>{label}<br />{children}</label></p>;
}
export function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><div className="flex items-center gap-2"><AlertCircle size={16} /><strong>Please check:</strong></div><ul className="!text-red-700">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>;
}
export function ReadOnlyNotice({ role }: { role: Role }) {
  return role === "Operator" ? <p className="!mb-5 flex items-center gap-2 rounded-xl bg-[#fff7df] px-4 py-3 !text-xs !text-[#9c884c]"><LockKeyhole size={15} />Operator access: setup is view-only. Switch to Admin to manage these records.</p> : null;
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status === "Dispatched" ? "bg-[#e4f1e1] text-[#5b8752]" : status === "Draft" ? "bg-[#fff3cd] text-[#a88a35]" : "bg-[#fae9e4] text-[#b07b6c]"}`}>{status}</span>;
}
export function OwnershipBadge({ ownership }: { ownership: string }) {
  return <span className={`ownership-badge ${ownership === "customer" ? "bg-[#e9f2e6] text-[#66855a]" : "bg-[#f5efda] text-[#a28e4e]"}`}>{ownership === "customer" ? "Customer-owned" : "Laundry Pool"}</span>;
}
export function ActiveBadge({ active }: { active: boolean }) {
  return <span className={`status-badge ${active ? "bg-[#e9f3e3] text-[#769364]" : "bg-[#eef0e9] text-[#97a08c]"}`}>{active ? "Active" : "Inactive"}</span>;
}
export function QuantitySummary({ records }: { records: Dispatch[] }) {
  const t = totals(records);
  return <section aria-label="Quantity summary" className="my-5">
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-[#edf4e8] p-4"><dt className="text-[11px] text-[#79916d]">Customer-owned pieces</dt><dd className="mt-2 text-2xl font-semibold text-[#507243]">{fmt(t.customerPieces)}</dd></div>
      <div className="rounded-xl bg-[#f8f3df] p-4"><dt className="text-[11px] text-[#ac9a5d]">Laundry Pool pieces</dt><dd className="mt-2 text-2xl font-semibold text-[#93804c]">{fmt(t.poolPieces)}</dd></div>
      <div className="rounded-xl bg-[#f2f5ed] p-4"><dt className="text-[11px] text-[#89957d]">Total equivalent pieces</dt><dd className="mt-2 text-2xl font-semibold">{fmt(t.pieces)} <span className="text-xs font-normal">pieces</span></dd></div>
      <div className="rounded-xl border border-[#e4e9dd] p-4"><dt className="text-[11px] text-[#89957d]">Weight-based linen</dt><dd className="mt-2 text-xl font-semibold">{fmt(t.weights.kg)} kg <span className="text-xs font-normal text-[#89957d]">/ {fmt(t.weights.lb)} lb</span></dd></div>
    </dl>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#8b987e]"><span>{t.carts} cart entries</span><span>Customer-owned weight: {fmt(t.ownershipWeights.customer.kg)} kg · {fmt(t.ownershipWeights.customer.lb)} lb</span><span>Pool weight: {fmt(t.ownershipWeights.pool.kg)} kg · {fmt(t.ownershipWeights.pool.lb)} lb</span></div>
    {t.weighedCarts > 0 && <><h3>Cart weighing · {t.weighedCarts} weighed carts</h3>
      <div className="table-scroll"><table><thead><tr><th>Unit</th><th>Cart count</th><th>Tare</th><th>Gross</th><th>Net</th></tr></thead>
        <tbody>{(["kg", "lb"] as const).filter(unit => t.cartWeights[unit].count).map(unit => {
          const w = t.cartWeights[unit]; return <tr key={unit}><td>{unit}</td><td>{w.count}</td><td>{fmt(w.tare)} {unit}</td><td>{fmt(w.gross)} {unit}</td><td>{fmt(w.net)} {unit}</td></tr>;
        })}</tbody></table></div><p className="!text-xs">Each cart is counted once. Cart weights are separate from item quantities.</p></>}
  </section>;
}
export function imageUpload(file: File, done: (value: string) => void, fail: (value: string) => void) {
  if (!file.type.match(/^image\/(png|jpeg|webp)$/)) return fail("Choose a PNG, JPEG or WebP image.");
  if (file.size > 300_000) return fail("Use an image smaller than 300 KB for this localStorage demo.");
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result));
  reader.onerror = () => fail("The image could not be read.");
  reader.readAsDataURL(file);
}
