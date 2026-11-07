"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { AlertCircle, Delete, LockKeyhole, X } from "lucide-react";
import { BedLinenIcon, KitchenLinenIcon, LinenStackIcon, TableLinenIcon, TowelIcon, UniformIcon, type LinenIconProps } from "./LinenIcons";
import type { Database, Dispatch, Role } from "../lib/types";
import { fmt, totals } from "../lib/domain";

const categoryIcons: { pattern: RegExp; icon: ComponentType<LinenIconProps>; tone: string }[] = [
  { pattern: /towel|bath|mat/i, icon: TowelIcon, tone: "aqua" },
  { pattern: /pillow|sheet|duvet|blanket|bedding|bed/i, icon: BedLinenIcon, tone: "blue" },
  { pattern: /kitchen|chef|cook|apron/i, icon: KitchenLinenIcon, tone: "amber" },
  { pattern: /restaurant|table|napkin|dining/i, icon: TableLinenIcon, tone: "violet" },
  { pattern: /uniform|shirt|garment|apparel|clothing/i, icon: UniformIcon, tone: "teal" },
];
const fallbackCategory = { icon: LinenStackIcon, tone: "teal" };
const categoryAppearance = (name?: string | null) => categoryIcons.find(({ pattern }) => pattern.test(name?.trim() || "")) || fallbackCategory;

export function categoryIcon(name?: string | null): ComponentType<LinenIconProps> {
  return categoryAppearance(name).icon;
}

export function CategoryGlyph({ name, size = 14, className = "size-7 rounded-lg" }: { name?: string | null; size?: number; className?: string }) {
  const { icon: Icon, tone } = categoryAppearance(name);
  return <span className={`category-glyph inline-flex shrink-0 items-center justify-center ${className}`} data-category-tone={tone} aria-hidden="true"><Icon size={size} strokeWidth={1.8} /></span>;
}

export function CategoryLabel({ name }: { name?: string | null }) {
  if (!name) return <>—</>;
  return <span className="inline-flex items-center gap-2.5"><CategoryGlyph name={name} /><span>{name}</span></span>;
}

export type Mutate = (operation: (db: Database) => void, message: string) => boolean;
export interface MasterProps { db: Database; role: Role; mutate: Mutate }
export function Dialog({ title, onClose, children, badge, className = "" }: { title: string; onClose: () => void; children: React.ReactNode; badge?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal(); }, []);
  return <dialog ref={ref} aria-label={title} className={className} onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className={`mb-5 flex items-start justify-between gap-4 ${className.includes("keypad-dialog") ? "!mb-0 bg-brand-600 px-5 py-4 text-white" : "border-b border-line pb-5"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3"><h2 className={`!m-0 !text-xl ${className.includes("keypad-dialog") ? "!text-white" : ""}`}>{title}</h2>{badge}</div>
      <button type="button" className={`btn-quiet !size-11 !min-h-11 shrink-0 !p-0 ${className.includes("keypad-dialog") ? "!border-0 !bg-transparent !text-white hover:!bg-white/10" : ""}`} onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
    </div>{children}
  </dialog>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <p className="field"><label>{label}<br />{children}</label></p>;
}
export function KeypadDialog({ title, initial = "", decimal = true, onClose, onEnter }: {
  title: string; initial?: string; decimal?: boolean; onClose: () => void; onEnter: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [pressed, setPressed] = useState("");
  const [acc, setAcc] = useState(0);
  function press(key: string) {
    setPressed(key);
    if (key === "back") return setValue(v => v.slice(0, -1));
    if (key === "+") { setAcc(a => a + Number(value || 0)); setValue(""); return; }
    if (key === "." && (!decimal || value.includes("."))) return;
    setValue(v => v + key);
  }
  const display = value === "" ? (acc ? String(acc) : "0") : value;
  return <Dialog className="keypad-dialog" title={title} onClose={onClose}>
    <div className="grid grid-cols-[1fr_auto] items-stretch border-b border-line">
      <div className="flex items-center justify-end px-5 py-6 text-5xl font-semibold tabular-nums tracking-tight">{display}</div>
      <button type="button" className={`keypad-key !min-h-[88px] !w-[88px] ${pressed === "back" ? "is-pressed" : ""}`} aria-label="Backspace" onClick={() => press("back")}><Delete size={26} /></button>
    </div>
    <div className="keypad-grid">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "."].map(key =>
        <button key={key} type="button" className={`keypad-key ${pressed === key ? "is-pressed" : ""}`} aria-label={`Key ${key}`} disabled={key === "." && !decimal} onClick={() => press(key)}>{key}</button>)}
    </div>
    <button type="button" className="btn-primary keypad-enter" onClick={() => onEnter(String(acc + Number(value || 0)))}>Enter</button>
  </Dialog>;
}
export function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><div className="flex items-center gap-2"><AlertCircle size={16} /><strong>Please check:</strong></div><ul className="!text-red-700">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>;
}
export function ReadOnlyNotice({ role }: { role: Role }) {
  return role === "Operator" ? <p className="!mb-5 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 !text-xs !text-brand-700"><LockKeyhole size={15} />Operator access: setup is view-only. Switch to Admin to manage these records.</p> : null;
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status === "Ready" ? "bg-pool-50 text-pool-700" : status === "Dispatched" ? "bg-brand-50 text-brand-600" : status === "Draft" ? "bg-canvas text-muted" : "bg-red-50 text-red-600"}`}>{status === "Ready" ? "Ready for delivery" : status}</span>;
}
export function OwnershipBadge({ ownership }: { ownership: string }) {
  return <span className={`ownership-badge ${ownership === "customer" ? "bg-brand-100 text-brand-700" : "bg-pool-100 text-pool-700"}`}>{ownership === "customer" ? "Customer-owned" : "Laundry Pool"}</span>;
}
export function ActiveBadge({ active }: { active: boolean }) {
  return <span className={`status-badge ${active ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted"}`}>{active ? "Active" : "Inactive"}</span>;
}
export function QuantitySummary({ records }: { records: Dispatch[] }) {
  const t = totals(records);
  return <section aria-label="Quantity summary" className="my-5">
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="metric-own p-4"><dt className="text-[11px] font-medium text-brand-700">Customer-owned pieces</dt><dd className="mt-2 text-2xl font-semibold text-ink">{fmt(t.customerPieces)}</dd></div>
      <div className="metric-pool p-4"><dt className="text-[11px] font-medium text-pool-700">Laundry Pool pieces</dt><dd className="mt-2 text-2xl font-semibold text-ink">{fmt(t.poolPieces)}</dd></div>
      <div className="metric-total p-4"><dt className="text-[11px] font-medium text-total-700">Total equivalent pieces</dt><dd className="mt-2 text-2xl font-semibold">{fmt(t.pieces)} <span className="text-xs font-normal text-muted">pieces</span></dd></div>
      <div className="metric-weight p-4"><dt className="text-[11px] font-medium text-weight-700">Weight-based linen</dt><dd className="mt-2 text-xl font-semibold">{fmt(t.weights.kg)} kg <span className="text-xs font-normal text-weight-700">/ {fmt(t.weights.lb)} lb</span></dd></div>
    </dl>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted"><span>{t.carts} cart entries</span><span>Customer-owned weight: {fmt(t.ownershipWeights.customer.kg)} kg · {fmt(t.ownershipWeights.customer.lb)} lb</span><span>Pool weight: {fmt(t.ownershipWeights.pool.kg)} kg · {fmt(t.ownershipWeights.pool.lb)} lb</span></div>
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
