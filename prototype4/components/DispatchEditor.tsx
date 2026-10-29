"use client";
import { useRef, useState } from "react";
import { Check, Package, Pencil, Plus, Printer, Save, Trash2 } from "lucide-react";
import type { Cart, Database, Dispatch, Item, Line, Ownership, Unit, WeightUnit } from "../lib/types";
import { dispatchErrors, fmt, lineErrors, newCart, normalizeLine, ownerLabel, uid } from "../lib/domain";
import { Dialog, Errors, Field, OwnershipBadge, QuantitySummary, StatusBadge } from "./shared";

interface Props {
  db: Database; draft: Dispatch; onChange: (draft: Dispatch) => void;
  onSave: (draft: Dispatch, confirm: boolean) => Dispatch | undefined;
  onPreview: (record: Dispatch) => void; onOpen: (record: Dispatch) => void;
}
interface QuantitySelection { item: Item; ownership: Ownership; line?: Line }

function QuantityDialog({ selection, customerId, defaultWeightUnit, onClose, onSubmit }: {
  selection: QuantitySelection; customerId: string; defaultWeightUnit: WeightUnit;
  onClose: () => void; onSubmit: (line: Line) => void;
}) {
  const { item, ownership, line } = selection;
  const [quantity, setQuantity] = useState(line ? String(line.quantity) : "");
  const [unit, setUnit] = useState<Unit>(line?.unit || (item.defaultMethod === "weight" ? defaultWeightUnit : item.defaultMethod));
  const [bundleSize, setBundleSize] = useState(String(line?.bundleSize || item.bundleSize || ""));
  const [errors, setErrors] = useState<string[]>([]);
  const units = item.methods.flatMap(method => method === "weight" ? ["kg", "lb"] : [method]) as Unit[];
  function submit() {
    const result = normalizeLine({ id: line?.id || uid(), itemId: item.id, code: item.code, description: item.name,
      ownership, ownerCustomerId: ownership === "customer" ? customerId : null, quantity: Number(quantity), unit,
      bundleSize: unit === "bundles" ? Number(bundleSize) : null, equivalentPieces: null });
    const errors = lineErrors(result);
    if (!units.includes(unit)) errors.push("Choose a currently allowed unit.");
    if (errors.length) return setErrors(errors);
    onSubmit(result);
  }
  function key(value: string) {
    if (value === "Clear") return setQuantity("");
    if (value === "Backspace") return setQuantity(q => q.slice(0, -1));
    if (value === "." && (quantity.includes(".") || unit === "pieces" || unit === "bundles")) return;
    setQuantity(q => q + value);
  }
  return <Dialog title={`${line ? "Edit" : "Add"} ${item.code} · ${item.name}`} onClose={onClose}>
    <p><OwnershipBadge ownership={ownership} /></p><Errors errors={errors} />
    <form onSubmit={e => { e.preventDefault(); submit(); }}>
      <Field label="Quantity *"><input className="!py-4 !text-center !text-3xl !font-semibold" autoFocus required type="number" inputMode={unit === "kg" || unit === "lb" ? "decimal" : "numeric"} min={unit === "kg" || unit === "lb" ? "0" : "1"} step={unit === "kg" || unit === "lb" ? "any" : "1"} value={quantity} onChange={e => setQuantity(e.target.value)} /></Field>
      <Field label="Quantity unit *"><select value={unit} onChange={e => setUnit(e.target.value as Unit)}>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
      {unit === "bundles" && <>
        <Field label="Pieces per bundle used *"><input type="number" required min={1} step={1} value={bundleSize} onChange={e => setBundleSize(e.target.value)} /></Field>
        <p role="status">{quantity || "0"} bundles × {bundleSize || "0"} pieces = <strong>{fmt(Number(quantity) * Number(bundleSize))} equivalent pieces</strong></p>
      </>}
      <div role="group" aria-label="Numeric keypad" className="grid grid-cols-3 gap-2">{["7", "8", "9", "4", "5", "6", "1", "2", "3", "Clear", "0", "."].map(value => <button key={value} type="button" className="min-h-14 bg-[#f6f8f2] text-lg" aria-label={`Key ${value}`} disabled={value === "." && (unit === "pieces" || unit === "bundles")} onClick={() => key(value)}>{value}</button>)}<button type="button" className="col-span-3" onClick={() => key("Backspace")}>Backspace</button></div>
      <button type="submit" className="w-full"><Plus size={16} />{line ? "Update Line" : "Add Line"}</button>
    </form>
  </Dialog>;
}

export function LineTable({ cart, editable = false, onEdit, onRemove }: { cart: Cart; editable?: boolean; onEdit?: (line: Line) => void; onRemove?: (id: string) => void }) {
  return <div className="table-scroll"><table><caption className="px-4 pt-3">Selected items · {cart.reference || "No cart reference"}</caption>
    <thead><tr><th>Item code</th><th>Description</th><th>Ownership</th><th>Entered quantity</th><th>Unit</th><th>Pieces/bundle</th><th>Equivalent pieces</th>{editable && <th>Actions</th>}</tr></thead>
    <tbody>{cart.lines.map(line => <tr key={line.id}><td className="font-medium">{line.code}</td><td>{line.description}</td><td><OwnershipBadge ownership={line.ownership} /></td><td className="font-semibold">{fmt(line.quantity)}</td><td>{line.unit}</td><td>{line.unit === "bundles" ? line.bundleSize : "—"}</td><td>{line.equivalentPieces !== null ? fmt(line.equivalentPieces) : "—"}</td>{editable && <td><div className="flex gap-1"><button onClick={() => onEdit?.(line)}><Pencil size={12} />Edit</button><button className="btn-danger" onClick={() => onRemove?.(line.id)}><Trash2 size={12} />Remove</button></div></td>}</tr>)}</tbody>
  </table></div>;
}

export default function DispatchEditor({ db, draft, onChange, onSave, onPreview, onOpen }: Props) {
  const [cartId, setCartId] = useState(draft.carts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [selection, setSelection] = useState<QuantitySelection | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [nextCustomer, setNextCustomer] = useState<string | null>(null);
  const busy = useRef(false);
  const cart = draft.carts.find(c => c.id === cartId) || draft.carts[0];
  const selectedCustomer = db.customers.find(c => c.id === draft.customerId);
  const selectedSite = db.sites.find(s => s.id === draft.siteId);
  const update = (patch: Partial<Dispatch>) => onChange({ ...draft, ...patch });
  const updateCart = (patch: Partial<Cart>) => update({ carts: draft.carts.map(c => c.id === cart.id ? { ...c, ...patch } : c) });
  function changeCustomer(customerId: string) {
    if (draft.customerId === customerId) return;
    if (draft.carts.some(c => c.lines.length)) setNextCustomer(customerId);
    else update({ customerId, siteId: "", route: "" });
  }
  function resetCustomer() {
    if (nextCustomer === null) return;
    update({ customerId: nextCustomer, siteId: "", route: "", carts: draft.carts.map(c => ({ ...c, lines: [] })) });
    setNextCustomer(null); setErrors([]);
  }
  const available = db.assignments.filter(a => a.active && (a.ownership === "pool" || a.customerId === draft.customerId) && (ownershipFilter === "all" || a.ownership === ownershipFilter)).flatMap(a => {
    const item = db.items.find(i => i.id === a.itemId && i.active);
    if (!item || (categoryId && item.categoryId !== categoryId) || !`${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase())) return [];
    return [{ item, ownership: a.ownership, id: a.id }];
  });
  function save(confirm: boolean) {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = onSave(draft, confirm);
      if (result) { setErrors([]); if (confirm) { setConfirming(false); onOpen(result); } }
    } finally { busy.current = false; }
  }
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">{draft.number ? `Edit Draft · ${draft.number}` : "Create Dispatch"}</h1><p className="!mb-5 !mt-0 !text-xs">Build your carts, check the quantities, and dispatch with confidence.</p></div><StatusBadge status="Draft" /></div>
    <p className="!text-xs">{draft.number || "Document number assigned on first save"}</p>
    <Errors errors={errors} />
    <fieldset><legend>Dispatch details</legend>
      <Field label="Customer *"><select value={draft.customerId} onChange={e => changeCustomer(e.target.value)}><option value="">Select customer</option>{db.customers.filter(c => c.active || c.id === draft.customerId).map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}{!c.active && " (inactive)"}</option>)}</select></Field>
      <Field label="Delivery site / department *"><select value={draft.siteId} disabled={!draft.customerId} onChange={e => { const s = db.sites.find(s => s.id === e.target.value); update({ siteId: e.target.value, route: s?.route || "" }); }}><option value="">Select delivery site</option>{db.sites.filter(s => s.customerId === draft.customerId && (s.active || s.id === draft.siteId)).map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}{!s.active && " (inactive)"}</option>)}</select></Field>
      {draft.customerId && !db.sites.some(s => s.customerId === draft.customerId && s.active) && <p>No active sites. An Admin can add one under Customers → Delivery Sites / Departments.</p>}
      {selectedSite && <p>Delivery address: {selectedSite.address}</p>}
      <Field label="Shipping date *"><input type="date" required value={draft.shippingDate} onChange={e => update({ shippingDate: e.target.value })} /></Field>
      <Field label="Route/reference"><input value={draft.route} onChange={e => update({ route: e.target.value })} /></Field>
      <Field label="Dispatch notes"><textarea rows={2} value={draft.notes} onChange={e => update({ notes: e.target.value })} /></Field>
    </fieldset>
    <h2>Cart entries</h2>
    <div className="mb-5 flex flex-wrap items-center gap-2"><div role="tablist" aria-label="Cart entries" className="flex flex-wrap gap-2">{draft.carts.map((c, index) => <button role="tab" aria-selected={cart.id === c.id} className={cart.id === c.id ? "!border-brand-500 !bg-brand-50 !text-brand-700" : ""} key={c.id} onClick={() => setCartId(c.id)}>Cart {index + 1}{c.reference ? ` · ${c.reference}` : ""}<span className="rounded bg-[#edf1e5] px-1.5 py-0.5 text-[10px] text-[#81916e]">{c.lines.length}</span></button>)}</div><button className="btn-quiet text-xs" onClick={() => { const added = newCart(db.company.defaultWeightUnit); update({ carts: [...draft.carts, added] }); setCartId(added.id); }}><Plus size={14} />Add Cart</button></div>
    <fieldset><legend>Current cart · {draft.carts.indexOf(cart) + 1}</legend>
      <p>Internal system ID: <code>{cart.id}</code></p>
      <Field label="Cart Reference (optional)"><input value={cart.reference} onChange={e => updateCart({ reference: e.target.value })} /></Field>
      <Field label="Cart comments"><textarea value={cart.comments} onChange={e => updateCart({ comments: e.target.value })} /></Field>
      <details><summary>Optional cart weighing{cart.gross !== null || cart.tare !== null ? " · entered" : ""}</summary>
        <Field label="Weight unit"><select value={cart.weightUnit} onChange={e => updateCart({ weightUnit: e.target.value as WeightUnit })}><option value="kg">kg</option><option value="lb">lb</option></select></Field>
        <Field label={`Tare weight (${cart.weightUnit})`}><input type="number" min={0} step="any" value={cart.tare ?? ""} onChange={e => updateCart({ tare: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
        <Field label={`Gross weight (${cart.weightUnit})`}><input type="number" min={0} step="any" value={cart.gross ?? ""} onChange={e => updateCart({ gross: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
        <p>Net weight: {cart.tare !== null && cart.gross !== null ? `${fmt(cart.gross - cart.tare)} ${cart.weightUnit}` : "Enter both tare and gross"}</p>
        <p><button onClick={() => updateCart({ tare: null, gross: null })}>Clear Weighing</button></p>
      </details>
      <p><button disabled={draft.carts.length === 1} onClick={() => { if (window.confirm("Remove this cart and all its lines?")) { const carts = draft.carts.filter(c => c.id !== cart.id); update({ carts }); setCartId(carts[0].id); } }}>Remove Cart</button></p>
    </fieldset>
    <fieldset disabled={!draft.customerId}><legend>Add linen to current cart</legend>
      {!draft.customerId && <p>Select a customer first.</p>}
      <Field label="Category"><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">All categories</option>{db.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Find item by code or name"><input type="search" value={search} onChange={e => setSearch(e.target.value)} /></Field>
      <Field label="Ownership filter"><select value={ownershipFilter} onChange={e => setOwnershipFilter(e.target.value)}><option value="all">All</option><option value="customer">Customer-owned</option><option value="pool">Laundry Pool</option></select></Field>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{available.map(({ item, ownership, id }) => <button key={id} className="group justify-start gap-3 bg-white p-4 text-left hover:border-brand-500 hover:bg-brand-50" onClick={() => setSelection({ item, ownership })}>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${ownership === "customer" ? "bg-[#edf4e5] text-[#81a16c]" : "bg-[#f7f1da] text-[#b9a566]"}`}>{item.image ? <img className="size-10 rounded-lg object-cover" src={item.image} alt="" /> : <Package size={21} strokeWidth={1.4} />}</span><span className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-normal text-[#9aa38c]">{item.code}</span><span className="mb-2 block text-xs font-medium">{item.name}</span><OwnershipBadge ownership={ownership} /></span><Plus size={15} className="text-[#b0bda1] group-hover:text-brand-600" />
      </button>)}</div>
      {draft.customerId && !available.length && <p>No matching assigned linen. Change the filters or ask an Admin to configure ownership in Linen Setup.</p>}
    </fieldset>
    <h2>Current cart items</h2>
    {cart.lines.length ? <LineTable cart={cart} editable onEdit={line => {
      const item = db.items.find(i => i.id === line.itemId);
      if (item) setSelection({ item, ownership: line.ownership, line }); else setErrors(["This catalogue item no longer exists. Remove the line."]);
    }} onRemove={id => { if (window.confirm("Remove this item line?")) updateCart({ lines: cart.lines.filter(l => l.id !== id) }); }} /> : <p>This cart is empty. Select an item to enter its quantity.</p>}
    <h2>Dispatch summary · all carts</h2><QuantitySummary records={[draft]} />
    <div className="sticky bottom-3 z-10 mt-7 flex flex-wrap gap-3 rounded-xl border border-[#e2e8db] bg-white/95 p-4 shadow-lg shadow-[#243a3410] backdrop-blur"><button onClick={() => save(false)}><Save size={16} />Save Draft</button><button className="btn-primary" onClick={() => { const problems = dispatchErrors(db, draft, true); setErrors(problems); if (!problems.length) setConfirming(true); }}><Check size={16} />Confirm Dispatch</button><button className="sm:ml-auto" onClick={() => onPreview(draft)}><Printer size={16} />Print Preview</button></div>
    {selection && <QuantityDialog key={`${selection.item.id}-${selection.ownership}-${selection.line?.id || "new"}`} selection={selection} customerId={draft.customerId} defaultWeightUnit={db.company.defaultWeightUnit} onClose={() => setSelection(null)} onSubmit={line => {
      updateCart({ lines: selection.line ? cart.lines.map(l => l.id === line.id ? line : l) : [...cart.lines, line] });
      setSelection(null); setErrors([]);
    }} />}
    {nextCustomer !== null && <Dialog title="Change customer and reset lines?" onClose={() => setNextCustomer(null)}>
      <p>Changing the customer will remove all item lines from every cart and clear the delivery site and route. Cart references, comments and weighing will remain.</p>
      <p>Current customer: {selectedCustomer?.name}. New customer: {db.customers.find(c => c.id === nextCustomer)?.name || "None selected"}.</p>
      <button onClick={resetCustomer}>Reset All Lines and Change Customer</button><button onClick={() => setNextCustomer(null)}>Keep Current Customer</button>
    </Dialog>}
    {confirming && <Dialog title="Confirm linen has left the laundry" onClose={() => setConfirming(false)}>
      <p><strong>{selectedCustomer?.code} · {selectedCustomer?.name}</strong><br />{selectedSite?.name} · {selectedSite?.department}<br />{selectedSite?.address}</p>
      <p>Shipping date: {draft.shippingDate} · {draft.carts.length} cart entries</p>
      <ul>{draft.carts.map((c, i) => <li key={c.id}>Cart {i + 1} · Reference: {c.reference || "None"} · {c.lines.length} lines</li>)}</ul>
      <QuantitySummary records={[draft]} /><p>Confirmation locks this record and preserves its shipping document details.</p>
      <div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => save(true)}><Check size={16} />Confirm Linen Out</button><button onClick={() => setConfirming(false)}>Return to Draft</button></div>
    </Dialog>}
  </section>;
}
