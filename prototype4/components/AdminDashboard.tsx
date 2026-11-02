"use client";
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, CalendarDays, ClipboardList, FileText, History, Layers3, PackageCheck, Truck, UsersRound } from "lucide-react";
import type { Database, Dispatch } from "../lib/types";
import { fmt, operational, today, totals } from "../lib/domain";
import { DispatchTable } from "./History";
import type { Page } from "./Navbar";

export default function AdminDashboard({ db, onCreate, onOpen, onPreview, onNavigate }: { db: Database; onCreate: () => void; onOpen: (record: Dispatch) => void; onPreview: (record: Dispatch) => void; onNavigate: (page: Page) => void }) {
  const records = operational(db).filter(d => d.shippingDate === today());
  const t = totals(records);
  const receipts = (db.receipts || []).filter(r => r.receivedDate === today());
  const drafts = db.dispatches.filter(d => d.status === "Draft");
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const actions = [
    { title: "Linen In", subtitle: "Receive soiled linen", description: "Record incoming bags, pieces and weight.", icon: ArrowDownToLine, theme: "in", tag: "RECEIVING", action: () => onNavigate("receiving"), footer: "Receive linen" },
    { title: "Linen Out", subtitle: "Prepare clean linen", description: "Select a customer, pack carts and add items.", icon: Layers3, theme: "out", tag: "CLEAN LINEN", action: onCreate, footer: "Start linen out" },
    { title: "Dispatches", subtitle: "Get deliveries on their way", description: "Resume saved carts and confirm dispatch.", icon: Truck, theme: "dispatch", tag: `${drafts.length} DRAFT${drafts.length === 1 ? "" : "S"} WAITING`, action: () => onNavigate("drafts"), footer: "Open dispatch queue" },
  ];
  return <section className="dashboard admin-dashboard">
    <div className="dashboard-heading"><div><div className="eyebrow">LAUNDRY OWNER WORKSPACE</div><h1>Shipping & receiving</h1><p>From the first bag in to the last cart out.</p></div><div className="date-label"><CalendarDays size={17} /><span>{date}</span></div></div>
    <div className="today-strip" aria-label="Today's activity">
      {[{ label: "Receipts today", value: receipts.length, icon: ArrowDownToLine, tone: "in" }, { label: "Pieces dispatched", value: t.pieces, icon: ArrowUpFromLine, tone: "out" }, { label: "Dispatches today", value: records.length, icon: Truck, tone: "dispatch" }, { label: "Customers served", value: new Set(records.map(d => d.customerId)).size, icon: UsersRound, tone: "neutral" }].map(metric => <div className="today-metric" key={metric.label}><span className={`metric-icon tone-${metric.tone}`}><metric.icon size={21} strokeWidth={1.7} /></span><div><span>{metric.label}</span><strong>{fmt(metric.value)}</strong></div></div>)}
    </div>
    <div className="section-heading"><h2>What would you like to do?</h2><span>Select an operation to get started</span></div>
    <div className="operation-grid">{actions.map(action => <button className={`operation-card operation-${action.theme}`} key={action.title} onClick={action.action}>
      <div className="operation-top"><span className="operation-icon"><action.icon size={38} strokeWidth={1.5} /></span><span className="operation-tag">{action.tag}</span></div>
      <div className="operation-copy"><h3>{action.title}</h3><strong>{action.subtitle}</strong><p>{action.description}</p></div>
      <div className="operation-footer"><span>{action.footer}</span><span className="operation-arrow"><ArrowRight size={19} /></span></div>
    </button>)}</div>
    <div className="quick-links">
      {[{ title: "Shipping manifests", description: "View and print delivery documents", icon: FileText, page: "manifests" as Page }, { title: "Dispatch history", description: "Find a previous dispatch", icon: History, page: "history" as Page }, { title: "Receiving records", description: "Review incoming linen", icon: ClipboardList, page: "receipts" as Page }].map(link => <button key={link.title} onClick={() => onNavigate(link.page)}><span className="quick-icon"><link.icon size={22} strokeWidth={1.6} /></span><span><strong>{link.title}</strong><small>{link.description}</small></span><ArrowRight size={17} className="ml-auto text-muted" /></button>)}
    </div>
    <div className="dashboard-bottom"><section className="recent-panel"><div className="panel-heading"><div><h2>Recent dispatches</h2><p>Your latest activity, all in one place.</p></div><button className="btn-quiet" onClick={() => onNavigate("history")}>View all <ArrowRight size={16} /></button></div><DispatchTable db={db} records={[...db.dispatches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)} onOpen={onOpen} onPreview={onPreview} compact /></section>
      <aside className="daily-summary"><div className="summary-heading"><PackageCheck size={21} /><h2>Out the door today</h2></div><p>Confirmed dispatches only</p><dl><div><dt><span className="summary-dot own" />Customer-owned</dt><dd>{fmt(t.customerPieces)}<small>pieces</small></dd></div><div><dt><span className="summary-dot pool" />Laundry pool</dt><dd>{fmt(t.poolPieces)}<small>pieces</small></dd></div></dl><div className="summary-total"><span>Total pieces</span><strong>{fmt(t.pieces)}</strong></div><div className="summary-weight"><span>Weight-based linen</span><strong>{fmt(t.weights.kg)} kg{t.weights.lb > 0 && ` / ${fmt(t.weights.lb)} lb`}</strong></div><div className="summary-note">{t.carts} cart entries across {records.length} dispatches</div></aside>
    </div>
  </section>;
}
