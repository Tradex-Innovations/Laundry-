"use client";
import { ArrowRight, ArrowUpRight, Boxes, CalendarDays, Check, ClipboardList, Clock3, FileText, Layers3, PackageCheck, Plus, Truck, UsersRound, Weight } from "lucide-react";
import type { Database, Dispatch } from "../lib/types";
import { fmt, operational, today, totals } from "../lib/domain";
import { DispatchTable } from "./History";

export default function Dashboard({ db, onCreate, onOpen, onPreview, onHistory, onDrafts }: { db: Database; onCreate: () => void; onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void; onHistory: () => void; onDrafts: () => void }) {
  const records = operational(db).filter(d => d.shippingDate === today()); const t = totals(records);
  const drafts = db.dispatches.filter(d => d.status === "Draft");
  const mixed = db.dispatches.find(d => d.snapshot?.customer.id === "alexandra" && d.carts.length === 2);
  const cards = [
    { label: "Dispatches today", value: records.length, suffix: "dispatches", icon: Truck, color: "bg-brand-50 text-brand-600", detail: "Confirmed and on their way" },
    { label: "Cart entries", value: t.carts, suffix: "carts", icon: Boxes, color: "bg-brand-50 text-brand-600", detail: "Dispatched across all customers" },
    { label: "Draft dispatches", value: drafts.length, suffix: "drafts", icon: ClipboardList, color: "bg-canvas text-muted", detail: "Ready to pick up where you left off" },
    { label: "Customers served", value: new Set(records.map(d => d.customerId)).size, suffix: "customers", icon: UsersRound, color: "bg-brand-50 text-brand-600", detail: "Receiving fresh linen today" },
  ];
  const date = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return <section className="dashboard space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-brand-500" />YOUR DAILY OVERVIEW</div><h1 className="!mb-2 !text-[30px]">A fresh view of your laundry.</h1><p className="!m-0 !text-[13px]">Keep every cart, customer, and dispatch moving smoothly.</p></div>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs text-muted"><CalendarDays size={15} />{date}</div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="rounded-xl border border-line bg-white p-5">
      <div className="mb-5 flex items-center justify-between"><span className="text-xs font-medium text-muted">{card.label}</span><span className={`flex size-9 items-center justify-center rounded-lg ${card.color}`}><card.icon size={17} strokeWidth={1.7} /></span></div>
      <div className="flex items-baseline gap-2"><span className="text-[32px] font-semibold leading-none tracking-tight">{fmt(card.value)}</span><span className="text-[11px] text-muted">{card.suffix}</span></div>
      <div className="mt-4 text-[11px] text-muted">{card.detail}</div>
    </div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h2 className="!m-0 !text-base">Linen dispatched today</h2><p className="!mb-0 !mt-1 !text-xs">Ownership stays clear. Quantities stay separate.</p></div><span className="rounded-md bg-brand-50 px-2.5 py-1.5 text-[10px] text-brand-600">CLEAN LINEN OUT</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="metric-own p-5"><div className="mb-4 flex items-center gap-2 text-xs font-medium text-brand-700"><PackageCheck size={15} />Customer-owned pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.customerPieces)}<span className="ml-2 text-xs font-normal text-muted">pieces</span></div><div className="mt-3 text-[10px] text-muted">Returned to their customer</div></div>
          <div className="metric-pool p-5"><div className="mb-4 flex items-center gap-2 text-xs font-medium text-pool-700"><Layers3 size={15} />Laundry Pool pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.poolPieces)}<span className="ml-2 text-xs font-normal text-muted">pieces</span></div><div className="mt-3 text-[10px] text-muted">Issued from your shared pool</div></div>
          <div className="metric-total p-5"><div className="mb-4 flex items-center gap-2 text-xs font-medium text-total-700"><Check size={15} />Total equivalent pieces</div><div className="text-[28px] font-semibold tracking-tight text-ink">{fmt(t.pieces)}<span className="ml-2 text-xs font-normal text-muted">pieces</span></div><div className="mt-3 text-[10px] text-muted">Customer-owned and pool pieces combined</div></div>
          <div className="metric-weight p-5"><div className="mb-4 flex items-center gap-2 text-xs font-medium text-weight-700"><Weight size={15} />Weight-based linen</div><div className="text-[28px] font-semibold tracking-tight">{fmt(t.weights.kg)}<span className="ml-2 text-xs font-normal text-muted">kg</span></div><div className="mt-3 text-[10px] text-muted">{fmt(t.weights.lb)} lb · counted separately</div></div>
        </div>
      </section>
      <section className="relative overflow-hidden rounded-2xl bg-brand-50 p-6">
        <div className="absolute -right-8 -top-10 size-40 rounded-full border-[22px] border-white/20" aria-hidden="true" />
        <div className="relative"><span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-white/65 text-brand-600"><Truck size={21} strokeWidth={1.5} /></span><h2 className="!m-0 !text-xl !text-ink">Fresh linen.<br />Ready to go.</h2><p className="!mb-5 !mt-3 !text-xs !text-muted">Create a dispatch, add your carts,<br />and send it on its way.</p><button className="btn-primary w-full justify-between text-xs" onClick={onCreate}>Create Dispatch <Plus size={16} /></button></div>
      </section>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="!m-0 !text-base">Recent dispatches</h2><p className="!mb-0 !mt-1 !text-xs">Your latest linen movements, all in one place.</p></div><button className="btn-quiet !min-h-8 !px-0 !text-xs" onClick={onHistory}>View all <ArrowUpRight size={14} /></button></div>
        <DispatchTable db={db} records={db.dispatches.slice(0, 5)} onOpen={onOpen} onPreview={onPreview} compact />
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted"><Check size={12} />Operational totals exclude drafts and cancelled dispatches.</div>
      </section>
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="!m-0 !text-sm">Pick up where you left off</h2><span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Clock3 size={14} /></span></div><p className="!mt-0 !text-xs">{drafts.length ? `${drafts.length} saved ${drafts.length === 1 ? "draft is" : "drafts are"} waiting for a final check.` : "No drafts waiting. You're all caught up."}</p><button className="w-full justify-between text-xs" onClick={onDrafts}>View Draft Dispatches <ArrowRight size={14} /></button></section>
        {mixed && <section className="rounded-2xl border border-line bg-brand-50 p-5"><div className="mb-3 flex items-center gap-2 text-brand-700"><FileText size={15} /><span className="text-[10px] font-medium uppercase tracking-wider">Manifest example</span></div><h2 className="!m-0 !text-sm">Alexandra Hotel</h2><p className="!my-2 !text-xs">2 carts · mixed ownership<br />190 pieces + 12.5 kg separately</p><button className="btn-quiet !min-h-8 !px-0 !text-xs" onClick={() => onPreview(mixed)}>Preview Shipping Manifest <ArrowUpRight size={14} /></button></section>}
      </div>
    </div>
  </section>;
}
