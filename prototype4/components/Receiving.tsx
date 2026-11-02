"use client";
import { useState } from "react";
import { ArrowDownToLine, ArrowRight, Check, ClipboardList, PackageOpen, Search, UsersRound } from "lucide-react";
import type { Database, Receipt, ReceivingInput, Role } from "../lib/types";
import { fmt } from "../lib/domain";
import { newReceipt, receivingErrors, saveReceipt } from "../lib/receiving";
import { Dialog, Errors, Field, KeypadDialog, type Mutate } from "./shared";

export default function Receiving({ db, role, mutate, onDirtyChange, initialView = "new" }: { initialView?: "new" | "records"; db: Database; role: Role; mutate: Mutate; onDirtyChange: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState(newReceipt);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"new" | "records">(initialView);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [pad, setPad] = useState<"containers" | "pieces" | "weightKg" | null>(null);
  const customer = db.customers.find(c => c.id === draft.customerId);
  const sites = db.sites.filter(s => s.customerId === draft.customerId && s.active);
  const site = sites.find(s => s.id === draft.siteId);
  const update = (patch: Partial<ReceivingInput>) => { setDraft(d => ({ ...d, ...patch })); onDirtyChange(true); };
  const records = (db.receipts || []).filter(r => `${r.number} ${r.customerName} ${r.reference} ${r.siteName}`.toLowerCase().includes(query.toLowerCase()));
  const padLabels = { containers: "Bags / carts", pieces: "Total pieces", weightKg: "Net weight (kg)" };
  function confirm() {
    let saved: Receipt | undefined;
    if (mutate(state => { saved = saveReceipt(state, draft, role); }, "Linen received. The receiving record is saved on this device.")) {
      setConfirming(false); setDraft(newReceipt()); onDirtyChange(false); setErrors([]); setSelected(saved!); setTab("records"); setQuery("");
    }
  }
  return <section>
    <div className="workflow-heading"><div><div className="eyebrow">RECEIVING</div><h1>Linen In <span className="text-muted font-normal">/ Soiled</span></h1><p>Receive a batch and record what arrived.</p></div><span className="metric-icon tone-in"><ArrowDownToLine size={25} /></span></div>
    <div className="mb-6 flex flex-wrap gap-3" aria-label="Receiving views"><button aria-pressed={tab === "new"} className={tab === "new" ? "btn-primary" : ""} onClick={() => { setTab("new"); setQuery(""); }}><PackageOpen size={18} />Receive linen</button><button aria-pressed={tab === "records"} className={tab === "records" ? "btn-primary" : ""} onClick={() => { setTab("records"); setQuery(""); }}><ClipboardList size={18} />Receiving records <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-xs">{db.receipts?.length || 0}</span></button></div>
    {tab === "new" ? <>
      <div className="workflow-steps" aria-label="Receiving progress"><span data-active={!customer}><b>1</b>Select customer</span><i /><span data-active={!!customer}><b>2</b>Record incoming linen</span><i /><span><b>3</b>Confirm receipt</span></div>
      <Errors errors={errors} />
      {!customer ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="!m-0 !text-base">Who is this linen from?</h2><input type="search" aria-label="Search receiving customers" placeholder="Search customer name or code" value={query} onChange={e => setQuery(e.target.value)} className="!max-w-sm" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{db.customers.filter(c => c.active && `${c.name} ${c.code}`.toLowerCase().includes(query.toLowerCase())).map(c => <button key={c.id} className="tile-card" onClick={() => { const available = db.sites.filter(s => s.customerId === c.id && s.active); update({ customerId: c.id, siteId: available.length === 1 ? available[0].id : "" }); setQuery(""); }}><span className="tile-thumb"><UsersRound size={29} strokeWidth={1.5} /></span><span className="tile-body"><span className="text-base font-semibold">{c.name}</span><span className="mt-1 text-xs">{c.code}</span></span><ArrowRight size={18} className="mr-5 self-center text-muted" /></button>)}</div>
        {!db.customers.some(c => c.active && `${c.name} ${c.code}`.toLowerCase().includes(query.toLowerCase())) && <p>No matching customers. Try another name or add a customer in Administration.</p>}
      </> : <div className="receiving-grid"><div><div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4"><span className="flex items-center gap-3"><UsersRound size={21} className="text-brand-600" /><strong>{customer.name}</strong></span><button onClick={() => update({ customerId: "", siteId: "" })}>Change customer</button></div>
        <div className="receiving-form">
          <Field label="Collection site *"><select required value={draft.siteId} onChange={e => update({ siteId: e.target.value })}><option value="">Select collection site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}</select></Field>
          <Field label="Received date *"><input type="date" required value={draft.receivedDate} onChange={e => update({ receivedDate: e.target.value })} /></Field>
          <Field label="Bags / carts *"><button className="keypad-field" onClick={() => setPad("containers")}>{fmt(draft.containers)}</button></Field>
          <Field label="Collection reference"><input value={draft.reference} placeholder="e.g. collection note or cart ID" onChange={e => update({ reference: e.target.value })} /></Field>
          <Field label="Total pieces"><button className="keypad-field" onClick={() => setPad("pieces")}>{draft.pieces ? fmt(draft.pieces) : "Tap to enter pieces"}</button></Field>
          <Field label="Net linen weight (kg)"><button className="keypad-field" onClick={() => setPad("weightKg")}>{draft.weightKg ? fmt(draft.weightKg) : "Tap to enter weight"}</button></Field>
          <p className="full-width !m-0 !text-xs">Enter pieces, net weight, or both. Net weight excludes the bag or cart.</p>
          <div className="full-width"><Field label="Receiving notes"><textarea value={draft.notes} onChange={e => update({ notes: e.target.value })} placeholder="Condition of linen, shortages or collection notes…" /></Field></div>
        </div></div><aside className="receipt-summary"><h2>Incoming batch</h2><p className="!text-xs">{customer.name}<br />{site?.name || "Select a collection site"}</p><dl><div><dt>Bags / carts</dt><dd>{fmt(draft.containers)}</dd></div><div><dt>Pieces</dt><dd>{fmt(draft.pieces)}</dd></div><div><dt>Net weight</dt><dd>{fmt(draft.weightKg)} kg</dd></div></dl><p className="!text-xs">Check the batch totals before confirming receipt.</p><button className="btn-primary w-full" onClick={() => { const problems = receivingErrors(db, draft); setErrors(problems); if (!problems.length) setConfirming(true); }}><Check size={18} />Review & receive</button><p className="!mb-0 !text-[11px]">Batch totals only. Item-level sorting is not part of this prototype.</p></aside></div>}
    </> : <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="!m-0 !text-base">Received linen</h2><p className="!mb-0 !mt-1 !text-xs">{records.length} receiving records</p></div><label className="relative w-full max-w-sm"><Search size={18} className="absolute left-3 top-4 text-muted" /><input className="!pl-10" type="search" aria-label="Search receiving records" placeholder="Receipt, customer or reference" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      {records.length ? <div className="table-scroll"><table><thead><tr><th>Receipt / date</th><th>Customer / site</th><th>Bags / carts</th><th>Pieces</th><th>Net weight</th><th>Action</th></tr></thead><tbody>{records.map(r => <tr key={r.id}><td><strong>{r.number}</strong><span className="mt-1 block text-xs text-muted">{r.receivedDate}</span></td><td>{r.customerName}<span className="mt-1 block text-xs text-muted">{r.siteName}</span></td><td>{fmt(r.containers)}</td><td>{fmt(r.pieces)}</td><td>{fmt(r.weightKg)} kg</td><td><button aria-label={`View receipt ${r.number}`} onClick={() => setSelected(r)}>View <ArrowRight size={16} /></button></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-line p-10 text-center"><PackageOpen size={35} className="mx-auto text-muted" /><h3>{query ? "No matching receipts" : "Ready for your first batch"}</h3><p>{query ? "Try a different customer, reference or receipt number." : "Incoming linen will appear here after you confirm receipt."}</p>{!query && <button onClick={() => setTab("new")}>Receive linen <ArrowRight size={17} /></button>}</div>}
    </>}
    {pad && <KeypadDialog title={padLabels[pad]} initial={draft[pad] ? String(draft[pad]) : ""} decimal={pad === "weightKg"} onClose={() => setPad(null)} onEnter={value => { update({ [pad]: Number(value) }); setPad(null); }} />}
    {confirming && <Dialog title="Confirm incoming linen" onClose={() => setConfirming(false)}><p><strong>{customer?.name}</strong><br />{site?.name} · {draft.receivedDate}</p><div className="rounded-xl bg-canvas p-5 text-lg">{fmt(draft.containers)} bags / carts · {fmt(draft.pieces)} pieces · {fmt(draft.weightKg)} kg</div><p>This saves a receiving record. Check the quantities against the batch that arrived.</p><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={confirm}><Check size={18} />Confirm receipt</button><button onClick={() => setConfirming(false)}>Keep editing</button></div></Dialog>}
    {selected && <Dialog title={selected.number} onClose={() => setSelected(null)}><span className="status-badge bg-pool-50 text-pool-700">Received</span><h3>{selected.customerName}</h3><p>{selected.siteName}<br />Received: {selected.receivedDate}</p><div className="receipt-summary"><dl><div><dt>Bags / carts</dt><dd>{fmt(selected.containers)}</dd></div><div><dt>Pieces</dt><dd>{fmt(selected.pieces)}</dd></div><div><dt>Net weight</dt><dd>{fmt(selected.weightKg)} kg</dd></div></dl></div><p>Reference: {selected.reference || "—"}<br />Notes: {selected.notes || "—"}</p><p className="!text-xs">Recorded by {selected.createdBy} · {new Date(selected.createdAt).toLocaleString()}</p><button className="btn-primary w-full" onClick={() => setSelected(null)}>Done</button></Dialog>}
  </section>;
}
