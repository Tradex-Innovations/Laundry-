"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ClipboardList, LayoutGrid, List, MapPin, PackageOpen, Plus, Printer, Save, Search, Trash2, UsersRound } from "lucide-react";
import type { Database, Item, Receipt, ReceivingInput, Role, WeightUnit } from "../lib/types";
import { fmt, uid } from "../lib/domain";
import { convertReceivingUnit, incomingNet, newIncomingCart, nextIncomingCartNumber, receiptWeightLabel, receivingErrors, saveReceipt } from "../lib/receiving";
import { CategoryGlyph, Dialog, Errors, Field, type Mutate } from "./shared";
import ReceivingKeypad from "./ReceivingKeypad";
import { ReceivingRecord } from "./ReceivingDocument";

type Pad = { kind: "quantity" | "itemWeight"; lineId: string; title: string; subtitle: string; initial: string } | { kind: "tare" | "gross"; title: string; initial: string; subtitle?: string };
export default function Receiving({ db, role, mutate, onDirtyChange, onPrint, onBack, initialView = "new" }: {
  initialView?: "new" | "records"; db: Database; role: Role; mutate: Mutate; onDirtyChange: (dirty: boolean) => void;
  onPrint: (record: Receipt) => void; onBack: () => void;
}) {
  const fresh = () => newIncomingCart(db.company.defaultWeightUnit);
  const [draft, setDraft] = useState(fresh);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"new" | "records">(initialView);
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pad, setPad] = useState<Pad | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const saving = useRef(false);
  const customer = db.customers.find(c => c.id === draft.customerId);
  const sites = db.sites.filter(s => s.customerId === draft.customerId && s.active);
  const site = sites.find(s => s.id === draft.siteId);
  const lines = draft.lines || [];
  const unit = draft.weightUnit || "kg";
  const net = incomingNet(draft);
  const routes = [...new Set(db.sites.filter(s => s.active && s.route).map(s => s.route))].sort();
  const customers = db.customers.filter(c => c.active && `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase()) && (!route || db.sites.some(s => s.active && s.customerId === c.id && s.route === route)));
  const eligible = db.items.filter(i => i.active && db.categories.some(c => c.id === i.categoryId && c.active) && db.assignments.some(a => a.active && a.itemId === i.id && (a.ownership === "pool" || a.customerId === draft.customerId)));
  const categories = db.categories.filter(c => c.active && eligible.some(i => i.categoryId === c.id));
  const items = eligible.filter(i => (!categoryId || categoryId === "*" || i.categoryId === categoryId) && `${i.name} ${i.code}`.toLowerCase().includes(itemSearch.toLowerCase()));
  const records = (db.receipts || []).filter(r => `${r.number} ${r.customerName} ${r.siteName} ${r.reference} ${r.lines?.map(l => `${l.code} ${l.description}`).join(" ") || ""}`.toLowerCase().includes(query.toLowerCase()));
  function markDirty(value: boolean) { setDirty(value); onDirtyChange(value); }
  function update(patch: Partial<ReceivingInput>) { setDraft(d => ({ ...d, ...patch })); markDirty(true); setErrors([]); }
  function discard() { return !dirty || window.confirm("Discard this incoming cart's unsaved changes?"); }
  function reset() { setDraft(fresh()); markDirty(false); setErrors([]); setCategoryId(""); setItemSearch(""); setPad(null); }
  function chooseCustomer(id: string) {
    const available = db.sites.filter(s => s.customerId === id && s.active);
    setDraft({ ...fresh(), customerId: id, siteId: available.length === 1 ? available[0].id : "" });
    setQuery(""); setCategoryId(""); setItemSearch(""); setErrors([]); markDirty(false);
  }
  function back() {
    if (view === "records" || !customer) { onBack(); return; }
    if (!discard()) return;
    reset(); setQuery("");
  }
  function recordsView() { if (!discard()) return; reset(); setView("records"); setQuery(""); }
  function addItem(item: Item) {
    const existing = lines.find(l => l.itemId === item.id);
    const id = existing?.id || uid();
    if (!existing) update({ lines: [...lines, { id, itemId: item.id, code: item.code, description: item.name, categoryName: db.categories.find(c => c.id === item.categoryId)?.name || "", quantity: 0, weight: null }] });
    setPad({ kind: "quantity", lineId: id, title: existing ? "Edit Quantity" : "Add Quantity", subtitle: item.name, initial: existing ? String(existing.quantity) : "" });
  }
  function save(print: boolean) {
    if (saving.current) return;
    const problems = receivingErrors(db, draft); setErrors(problems);
    if (problems.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    saving.current = true;
    try {
      let record: Receipt | undefined;
      if (mutate(state => { record = saveReceipt(state, draft, role); }, "Incoming cart saved.") && record) {
        setDraft({ ...fresh(), customerId: draft.customerId, siteId: draft.siteId, receivedDate: draft.receivedDate, weightUnit: unit });
        markDirty(false); setErrors([]);
        if (print) onPrint(record); else setSelected(record);
      }
    } finally { saving.current = false; }
  }
  function applyPad(value: number) {
    if (!pad) return;
    if (pad.kind === "quantity" || pad.kind === "itemWeight") update({ lines: lines.map(l => l.id === pad.lineId ? { ...l, [pad.kind === "quantity" ? "quantity" : "weight"]: value } : l) });
    else update({ [pad.kind]: value });
    setPad(null);
  }
  return <section className="incoming-screen">
    <div className="incoming-topbar"><div><h1>{view === "records" ? "Receiving Records" : !customer ? "Incoming Carts" : !site ? "Select Collection Site" : "Create Incoming Cart"}</h1>{customer && view === "new" && <button className="incoming-customer-chip" onClick={() => { if (discard()) { reset(); setQuery(""); } }}><UsersRound size={15} /><span>{customer.name}</span></button>}{site && view === "new" && <span className="incoming-site-chip"><MapPin size={14} />{site.name}</span>}</div>
      <div className="incoming-top-actions">{view === "new" && !customer && <><select aria-label="Filter receiving customers by route" value={route} onChange={e => setRoute(e.target.value)}><option value="">All routes</option>{routes.map(r => <option key={r}>{r}</option>)}</select><input type="search" aria-label="Search receiving customers" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customer" /></>}{site && view === "new" && <div className="incoming-layout-toggle" aria-label="Item display"><button aria-label="Grid view" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={19} /></button><button aria-label="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={20} /></button></div>}{view === "new" && <button onClick={recordsView}><ClipboardList size={17} /><span>Records</span></button>}{view === "records" && <button className="btn-primary" onClick={() => { setView("new"); setQuery(""); }}><Plus size={17} />Incoming cart</button>}<button onClick={back}><ArrowLeft size={17} />Back</button></div>
    </div>
    <Errors errors={errors} />
    {view === "new" && !customer && <div className="incoming-panel"><div className="incoming-panel-title"><h2>Select Customer</h2></div><div className="incoming-customer-grid">{customers.map(c => <button key={c.id} className="incoming-choice customer-choice" onClick={() => chooseCustomer(c.id)}><span className="incoming-choice-image"><UsersRound size={34} strokeWidth={1.4} /></span><span className="incoming-choice-label"><strong>{c.name}</strong><small>{c.code} · {db.sites.filter(s => s.customerId === c.id && s.active).length} {db.sites.filter(s => s.customerId === c.id && s.active).length === 1 ? "site" : "sites"}</small></span></button>)}</div>{!customers.length && <div className="incoming-empty"><UsersRound size={32} /><p>No matching customers. Try another name or route.</p></div>}</div>}
    {view === "new" && customer && !site && <div className="incoming-panel"><div className="incoming-panel-title"><h2>Select Collection Site / Department</h2></div><div className="incoming-customer-grid">{sites.map(s => <button key={s.id} className="incoming-choice customer-choice" onClick={() => setDraft(d => ({ ...d, siteId: s.id }))}><span className="incoming-choice-image"><MapPin size={34} strokeWidth={1.4} /></span><span className="incoming-choice-label"><strong>{s.name}</strong><small>{s.department || s.address}</small></span></button>)}</div>{!sites.length && <div className="incoming-empty"><MapPin size={32} /><p>No active collection sites. Ask the laundry owner to add a site for this customer.</p></div>}</div>}
    {view === "new" && customer && site && <>
      <div className="incoming-workspace"><div className="incoming-panel incoming-selected-panel"><div className="incoming-panel-title"><h2>Select Items</h2><label className="incoming-unit">Weight unit<select aria-label="Receiving weight unit" value={unit} onChange={e => { setDraft(d => convertReceivingUnit(d, e.target.value as WeightUnit)); markDirty(true); }}><option value="kg">kg</option><option value="lb">lb</option></select></label></div><div className="incoming-selected-content">
        <div className="incoming-table-scroll"><table className="incoming-items-table"><thead><tr><th>Item No.</th><th>Item</th><th>Quantity</th><th>Weight ({unit})</th><th><span className="sr-only">Remove item</span></th></tr></thead><tbody>{lines.map(line => <tr key={line.id}><td>{line.code}</td><td>{line.description}</td><td><button className="incoming-quantity" aria-label={`Quantity for ${line.description}`} onClick={() => setPad({ kind: "quantity", lineId: line.id, title: "Edit Quantity", subtitle: line.description, initial: line.quantity ? String(line.quantity) : "" })}>{fmt(line.quantity)}</button></td><td><button className="incoming-line-weight" aria-label={`Item weight for ${line.description}`} onClick={() => setPad({ kind: "itemWeight", lineId: line.id, title: `Item Weight (${unit})`, subtitle: line.description, initial: line.weight === null ? "" : String(line.weight) })}>{line.weight === null ? "—" : fmt(line.weight)}<small>{unit}</small></button></td><td><button className="incoming-remove" aria-label={`Remove ${line.description}`} onClick={() => update({ lines: lines.filter(l => l.id !== line.id) })}><Trash2 size={19} /></button></td></tr>)}</tbody></table></div>
        {!lines.length && <div className="incoming-empty"><PackageOpen size={40} strokeWidth={1.3} /><p>No items added yet.</p><small>Choose a category and tap an item.</small></div>}
        {lines.length > 0 && <div className="incoming-cart-count"><span>{lines.length} {lines.length === 1 ? "item" : "items"}</span><strong>{fmt(lines.reduce((n, l) => n + l.quantity, 0))} pieces</strong><small>Item weights are optional. Cart weighing stays separate.</small></div>}
      </div></div>
      <div className="incoming-panel incoming-catalogue"><div className="incoming-panel-title"><h2>{!categoryId ? "Select Category" : categoryId === "*" ? "All Items" : db.categories.find(c => c.id === categoryId)?.name || "Items"}</h2></div><div className="incoming-catalogue-content">
        {categoryId && <div className="incoming-catalogue-toolbar"><button onClick={() => { setCategoryId(""); setItemSearch(""); }}><ArrowLeft size={16} />Item Categories</button><label><Search size={16} /><input aria-label="Search incoming linen items" type="search" placeholder="Search item" value={itemSearch} onChange={e => setItemSearch(e.target.value)} /></label></div>}
        <div className={`incoming-choice-grid ${layout === "list" ? "is-list" : ""}`}>{!categoryId ? <>{categories.map(c => <button key={c.id} className="incoming-choice" onClick={() => setCategoryId(c.id)}><span className="incoming-choice-image"><CategoryGlyph name={c.name} size={32} className="size-14 rounded-xl" /></span><span className="incoming-choice-label"><strong>{c.name}</strong></span></button>)}{categories.length > 1 && <button className="incoming-choice" onClick={() => setCategoryId("*")}><span className="incoming-choice-image"><LayoutGrid size={30} strokeWidth={1.5} /></span><span className="incoming-choice-label"><strong>All Items</strong></span></button>}</> : items.map(item => <button key={item.id} className={`incoming-choice ${lines.some(l => l.itemId === item.id) ? "is-added" : ""}`} onClick={() => addItem(item)}><span className="incoming-choice-image">{item.image ? <img src={item.image} alt="" /> : <CategoryGlyph name={db.categories.find(c => c.id === item.categoryId)?.name} size={30} className="size-14 rounded-xl" />}</span><span className="incoming-choice-label"><strong>{item.name}</strong><small>{item.code}</small></span></button>)}</div>
        {(!categoryId ? !categories.length : !items.length) && <div className="incoming-empty"><p>No matching linen. Ask the laundry owner to check this customer's linen setup.</p></div>}
      </div></div></div>
      <div className="incoming-bottom-bar"><Field label="Cart Number (Auto)"><output className="incoming-net" aria-label="Next cart number" aria-live="polite">{nextIncomingCartNumber(db)}</output></Field><Field label={`Tare Weight (${unit})`}><button className="keypad-field" onClick={() => setPad({ kind: "tare", title: `Tare Weight (${unit})`, initial: String(draft.tare ?? "") })}>{draft.tare === null ? "—" : fmt(draft.tare || 0)}</button></Field><Field label="Receiving Date *"><input type="date" value={draft.receivedDate} onChange={e => update({ receivedDate: e.target.value })} /></Field><Field label={`Gross Weight (${unit})`}><button className="keypad-field" onClick={() => setPad({ kind: "gross", title: `Gross Weight (${unit})`, initial: String(draft.gross ?? "") })}>{draft.gross == null ? "Tap to enter" : fmt(draft.gross)}</button></Field><Field label={`Net Weight (${unit})`}><output className={`incoming-net ${net !== null && net < 0 ? "invalid" : ""}`} aria-label="Net cart weight" aria-live="polite">{net === null ? "—" : fmt(net)}</output></Field><button className="incoming-save" onClick={() => save(false)}><Save size={18} />Save</button><button className="btn-primary" onClick={() => save(true)}><Printer size={18} />Save & Print</button></div>
      <details className="incoming-extra"><summary>Notes & extra details</summary><div className="incoming-extra-fields"><Field label="Collection site"><select value={draft.siteId} onChange={e => update({ siteId: e.target.value })}>{sites.map(s => <option value={s.id} key={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}</select></Field><Field label="Receiving notes"><textarea value={draft.notes} onChange={e => update({ notes: e.target.value })} placeholder="Condition, discrepancies or collection notes" /></Field><button onClick={() => update({ tare: 0, gross: null })}>Clear cart weighing</button></div></details>
    </>}
    {view === "records" && <div className="incoming-panel"><div className="incoming-panel-title"><h2>Received Linen</h2><label className="incoming-record-search"><Search size={17} /><input type="search" aria-label="Search receiving records" value={query} onChange={e => setQuery(e.target.value)} placeholder="Receipt, customer, cart or item" /></label></div><div className="incoming-records"><div className="incoming-table-scroll"><table><thead><tr><th>Receipt / date</th><th>Customer / site</th><th>Cart / batch</th><th>Pieces</th><th>Net weight</th><th>Actions</th></tr></thead><tbody>{records.map(r => <tr key={r.id}><td><strong>{r.number}</strong><small className="block text-muted">{r.receivedDate}</small></td><td>{r.customerName}<small className="block text-muted">{r.siteName}</small></td><td>{r.lines === undefined ? `${r.containers} bags / carts` : r.reference}</td><td>{fmt(r.pieces)}</td><td>{receiptWeightLabel(r)}</td><td><div className="flex gap-2"><button aria-label={`View receipt ${r.number}`} onClick={() => setSelected(r)}>View <ArrowRight size={16} /></button><button aria-label={`Print receipt ${r.number}`} onClick={() => onPrint(r)}><Printer size={16} /></button></div></td></tr>)}</tbody></table></div>{!records.length && <div className="incoming-empty"><PackageOpen size={40} strokeWidth={1.4} /><p>{query ? "No matching receipts." : "No incoming carts recorded yet."}</p></div>}</div></div>}
    {pad && <ReceivingKeypad key={`${pad.kind}-${"lineId" in pad ? pad.lineId : "cart"}`} title={pad.title} subtitle={pad.subtitle} initial={pad.initial} decimal={pad.kind === "tare" || pad.kind === "gross" || pad.kind === "itemWeight"} positive={pad.kind === "quantity"} onClose={() => setPad(null)} onEnter={applyPad} />}
    {selected && <Dialog title={selected.number} className="!max-w-[900px]" onClose={() => setSelected(null)}><ReceivingRecord record={selected} /><div className="incoming-receipt-actions"><button onClick={() => { onPrint(selected); setSelected(null); }}><Printer size={17} />Print receipt</button><button className="btn-primary" onClick={() => setSelected(null)}>Done</button></div></Dialog>}
  </section>;
}
