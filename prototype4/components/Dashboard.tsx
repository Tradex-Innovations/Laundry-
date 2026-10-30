"use client";
import { ArrowRight, Boxes, CalendarDays, ChartNoAxesCombined, Check, ClipboardList, FileText, Layers3, PackageCheck, Settings2, Truck, UsersRound, Weight } from "lucide-react";
import type { Database, Dispatch } from "../lib/types";
import { fmt, operational, today, totals } from "../lib/domain";
import { DispatchTable } from "./History";
import type { Page } from "./Navbar";

export default function Dashboard({ db, onCreate, onOpen, onPreview, onNavigate }: { db: Database; onCreate: () => void; onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void; onNavigate: (page: Page) => void }) {
  const records = operational(db).filter(d => d.shippingDate === today()); const t = totals(records);
  const drafts = db.dispatches.filter(d => d.status === "Draft");
  const mixed = db.dispatches.find(d => d.snapshot?.customer.id === "alexandra" && d.carts.length === 2);
  const date = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const tiles = [
    { label: "Linen Out (Clean)", icon: Truck, color: "text-brand-500", action: onCreate },
    { label: "Draft Dispatches", icon: ClipboardList, color: "text-pool-600", action: () => onNavigate("drafts"), detail: drafts.length ? `${drafts.length} waiting` : undefined },
    { label: "Dispatch History", icon: FileText, color: "text-total-700", action: () => onNavigate("history") },
    { label: "Shipping Manifest", icon: FileText, color: "text-muted", action: () => mixed ? onPreview(mixed) : onNavigate("history") },
    { label: "Customers", icon: UsersRound, color: "text-brand-600", action: () => onNavigate("customers") },
    { label: "Linen Setup", icon: Layers3, color: "text-weight-700", action: () => onNavigate("items") },
    { label: "Reports", icon: ChartNoAxesCombined, color: "text-pool-700", action: () => onNavigate("reports") },
    { label: "Settings", icon: Settings2, color: "text-muted", action: () => onNavigate("settings") },
  ];
  return <section className="dashboard space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><span className="size-1.5 rounded-full bg-brand-500" />Tablet workspace</div><h1 className="!mb-2 !text-[30px]">Linen Out</h1><p className="!m-0 !text-sm">Large tap targets for carts, customers, and quantities.</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted" suppressHydrationWarning><CalendarDays size={16} />{date}</div>
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{tiles.map(tile => {
      const Icon = tile.icon;
      return <button key={tile.label} type="button" className="launch-tile" onClick={tile.action}>
        <Icon size={36} strokeWidth={1.5} className={tile.color} />
        <span className="text-sm font-semibold text-ink">{tile.label}</span>
        {tile.detail && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-600">{tile.detail}</span>}
      </button>;
    })}</div>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[{ label: "Dispatches today", value: records.length, icon: Truck }, { label: "Cart entries", value: t.carts, icon: Boxes }, { label: "Drafts", value: drafts.length, icon: ClipboardList }, { label: "Customers served", value: new Set(records.map(d => d.customerId)).size, icon: UsersRound }].map(card => <div key={card.label} className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">{card.label}<card.icon size={18} className="text-brand-500" /></div>
        <div className="text-[32px] font-semibold tracking-tight">{fmt(card.value)}</div>
      </div>)}
    </div>
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="mb-6"><h2 className="!m-0 !text-base">Linen dispatched today</h2><p className="!mb-0 !mt-1 !text-sm">Ownership stays clear. Quantities stay separate.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="metric-own p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-700"><PackageCheck size={16} />Customer-owned pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.customerPieces)}<span className="ml-2 text-sm font-normal text-muted">pieces</span></div></div>
        <div className="metric-pool p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-pool-700"><Layers3 size={16} />Laundry Pool pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.poolPieces)}<span className="ml-2 text-sm font-normal text-muted">pieces</span></div></div>
        <div className="metric-total p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-total-700"><Check size={16} />Total equivalent pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.pieces)}<span className="ml-2 text-sm font-normal text-muted">pieces</span></div></div>
        <div className="metric-weight p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-weight-700"><Weight size={16} />Weight-based linen</div><div className="text-[28px] font-semibold tracking-tight">{fmt(t.weights.kg)}<span className="ml-2 text-sm font-normal text-muted">kg</span></div></div>
      </div>
    </section>
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="!m-0 !text-base">Recent dispatches</h2><p className="!mb-0 !mt-1 !text-sm">Tap a row to open or resume.</p></div><button className="btn-quiet" onClick={() => onNavigate("history")}>View all <ArrowRight size={16} /></button></div>
      <DispatchTable db={db} records={db.dispatches.slice(0, 5)} onOpen={onOpen} onPreview={onPreview} compact />
    </section>
  </section>;
}
