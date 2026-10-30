"use client";
import { useRef, useState } from "react";
import { ArrowLeft, Check, Delete, Layers3, MapPin, PackageCheck, Pencil, Plus, Printer, Save, Trash2, UsersRound } from "lucide-react";
import type { Cart, Database, Dispatch, Item, Line, Ownership, Unit, WeightUnit } from "../lib/types";
import { dispatchErrors, fmt, lineErrors, newCart, normalizeLine, uid } from "../lib/domain";
import { CategoryGlyph, Dialog, Errors, Field, OwnershipBadge, QuantitySummary, StatusBadge } from "./shared";

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
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return <Dialog className="keypad-dialog" title={line ? "Edit Quantity" : "Add Quantity"} onClose={onClose}
    badge={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${ownership === "customer" ? "bg-brand-500 text-white" : "bg-pool-600 text-white"}`}>{item.name}</span>}>
    <form className="!gap-0" onSubmit={e => { e.preventDefault(); submit(); }}>
      <div className="space-y-3 px-5 py-4">
        <OwnershipBadge ownership={ownership} />
        <Errors errors={errors} />
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="rounded-xl border border-line bg-canvas px-4 py-4 text-center text-4xl font-semibold tracking-tight">{quantity || "0"}</div>
          <button type="button" className="!size-[72px] !min-h-[72px] !rounded-xl !bg-ink !p-0 !text-white hover:!bg-slate-700" aria-label="Backspace" onClick={() => key("Backspace")}><Delete size={26} /></button>
        </div>
        <div className="flex flex-wrap gap-2">{units.map(u => <button key={u} type="button" className={unit === u ? "btn-primary" : ""} onClick={() => setUnit(u)}>{u}</button>)}</div>
        {unit === "bundles" && <>
          <Field label="Pieces per bundle used *"><input type="number" required min={1} step={1} value={bundleSize} onChange={e => setBundleSize(e.target.value)} /></Field>
          <p role="status" className="!my-0">{quantity || "0"} bundles × {bundleSize || "0"} pieces = <strong>{fmt(Number(quantity) * Number(bundleSize))} equivalent pieces</strong></p>
        </>}
      </div>
      <div role="group" aria-label="Numeric keypad" className="grid grid-cols-3 border-t border-line">
        {keys.map(value => <button key={value} type="button" className="!min-h-[76px] !rounded-none !border-0 !border-b !border-r !border-line !text-2xl" aria-label={`Key ${value}`} onClick={() => key(value)}>{value}</button>)}
        <button type="button" className="!min-h-[76px] !rounded-none !border-0 !border-r !border-line !text-lg" onClick={() => key("Clear")}>C</button>
        <button type="button" className="!min-h-[76px] !rounded-none !border-0 !border-r !border-line !text-2xl" aria-label="Key 0" onClick={() => key("0")}>0</button>
        <button type="button" className="!min-h-[76px] !rounded-none !border-0 !border-line !text-2xl" aria-label="Decimal" disabled={unit === "pieces" || unit === "bundles"} onClick={() => key(".")}>.</button>
      </div>
      <button type="submit" className="btn-primary !min-h-16 !w-full !rounded-none !text-xl">{line ? "Update" : "Enter"}</button>
    </form>
  </Dialog>;
}

export function LineTable({ cart, editable = false, onEdit, onRemove }: { cart: Cart; editable?: boolean; onEdit?: (line: Line) => void; onRemove?: (id: string) => void }) {
  return <div className="table-scroll !my-0"><table><caption className="px-4 pt-3">Selected items · {cart.reference || "No cart reference"}</caption>
    <thead><tr><th>Item code</th><th>Item</th><th>Ownership</th><th>Quantity</th><th>Unit</th>{editable && <th>Action</th>}</tr></thead>
    <tbody>{cart.lines.map(line => <tr key={line.id}><td className="font-medium">{line.code}</td><td>{line.description}</td><td><OwnershipBadge ownership={line.ownership} /></td><td className="font-semibold">{fmt(line.quantity)}</td><td>{line.unit}</td>{editable && <td><div className="flex gap-1"><button onClick={() => onEdit?.(line)}><Pencil size={14} />Edit</button><button className="btn-danger" onClick={() => onRemove?.(line.id)}><Trash2 size={14} /></button></div></td>}</tr>)}</tbody>
  </table></div>;
}

export default function DispatchEditor({ db, draft, onChange, onSave, onPreview, onOpen }: Props) {
  const [cartId, setCartId] = useState(draft.carts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<"" | Ownership>("");
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
    else {
      const sites = db.sites.filter(s => s.customerId === customerId && (s.active || s.id === draft.siteId));
      const only = sites.length === 1 ? sites[0] : undefined;
      update({ customerId, siteId: only?.id || "", route: only?.route || "" });
    }
  }
  function resetCustomer() {
    if (nextCustomer === null) return;
    const sites = db.sites.filter(s => s.customerId === nextCustomer && s.active);
    const only = sites.length === 1 ? sites[0] : undefined;
    update({ customerId: nextCustomer, siteId: only?.id || "", route: only?.route || "", carts: draft.carts.map(c => ({ ...c, lines: [] })) });
    setNextCustomer(null); setErrors([]);
  }
  const available = db.assignments.filter(a => a.active && (a.ownership === "pool" || a.customerId === draft.customerId) && a.ownership === ownershipFilter).flatMap(a => {
    const item = db.items.find(i => i.id === a.itemId && i.active);
    if (!item || (categoryId && categoryId !== "*" && item.categoryId !== categoryId) || !`${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase())) return [];
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
  const customers = db.customers.filter(c => c.active || c.id === draft.customerId);
  const sites = db.sites.filter(s => s.customerId === draft.customerId && (s.active || s.id === draft.siteId));
  const net = cart.tare !== null && cart.gross !== null ? fmt(cart.gross - cart.tare) : "";

  if (!draft.customerId) return <section>
    <h1 className="!mb-2">Select Customer</h1>
    <p className="!mt-0">Tap a customer card to start an outgoing cart.</p>
    <Errors errors={errors} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{customers.map(c => {
      const site = db.sites.find(s => s.customerId === c.id && s.active);
      return <button key={c.id} type="button" className="tile-card" onClick={() => changeCustomer(c.id)}>
        <span className="tile-thumb"><UsersRound size={32} strokeWidth={1.5} /></span>
        <span className="tile-body"><span className="block truncate text-base font-semibold">{c.name}</span><span className="mt-1 block text-xs text-white/80">Department: {site?.department || "—"}</span></span>
      </button>;
    })}</div>
  </section>;

  if (!draft.siteId) return <section>
    <button type="button" className="btn-quiet !px-0" onClick={() => update({ customerId: "", siteId: "", route: "" })}><ArrowLeft size={18} />Change customer</button>
    <h1 className="!mb-2">Select delivery site</h1>
    <p className="!mt-0">{selectedCustomer?.code} · {selectedCustomer?.name}</p>
    <Errors errors={errors} />
    {sites.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{sites.map(s => <button key={s.id} type="button" className="tile-card" onClick={() => update({ siteId: s.id, route: s.route || "" })}>
      <span className="tile-thumb"><MapPin size={32} strokeWidth={1.5} /></span>
      <span className="tile-body"><span className="block truncate text-base font-semibold">{s.name}</span><span className="mt-1 block text-xs text-white/80">Department: {s.department || "—"}</span></span>
    </button>)}</div> : <p>No active sites. An Admin can add one under Customers → Delivery Sites / Departments.</p>}
  </section>;

  return <section>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">{draft.number ? `Edit Draft · ${draft.number}` : "Create Outgoing Carts"}</h1><p className="!mb-0 !mt-0 !text-sm">Build your carts, check the quantities, and dispatch with confidence.</p></div><StatusBadge status="Draft" /></div>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <button type="button" className="!h-auto !min-h-12 !justify-start !py-2" onClick={() => changeCustomer("")}><UsersRound size={16} />{selectedCustomer?.name}<span className="text-xs font-normal text-muted">Change</span></button>
      <button type="button" className="!h-auto !min-h-12 !justify-start !py-2" onClick={() => update({ siteId: "", route: selectedSite?.route || "" })}><MapPin size={16} />{selectedSite?.name}{selectedSite?.department ? ` · ${selectedSite.department}` : ""}</button>
    </div>
    <Errors errors={errors} />
    <div className="mb-4 flex flex-wrap items-center gap-2"><div role="tablist" aria-label="Cart entries" className="flex flex-wrap gap-2">{draft.carts.map((c, index) => <button role="tab" aria-selected={cart.id === c.id} className={cart.id === c.id ? "!border-brand-500 !bg-brand-50 !text-brand-700" : ""} key={c.id} onClick={() => setCartId(c.id)}>Cart {index + 1}{c.reference ? ` · ${c.reference}` : ""}<span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">{c.lines.length}</span></button>)}</div><button className="btn-quiet" onClick={() => { const added = newCart(db.company.defaultWeightUnit); update({ carts: [...draft.carts, added] }); setCartId(added.id); }}><Plus size={16} />Add Cart</button></div>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
      <div className="min-w-0 rounded-2xl border border-line bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="!m-0 !text-base">Select Items</h2><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item no or name" className="!max-w-xs" /></div>
        {cart.lines.length ? <LineTable cart={cart} editable onEdit={line => {
          const item = db.items.find(i => i.id === line.itemId);
          if (item) setSelection({ item, ownership: line.ownership, line }); else setErrors(["This catalogue item no longer exists. Remove the line."]);
        }} onRemove={id => { if (window.confirm("Remove this item line?")) updateCart({ lines: cart.lines.filter(l => l.id !== id) }); }} /> : <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center">This cart is empty. Choose a category, then Customer-owned or Laundry Pool.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Cart Reference (optional)"><input value={cart.reference} onChange={e => updateCart({ reference: e.target.value })} /></Field>
          <Field label="Cart comments"><input value={cart.comments} onChange={e => updateCart({ comments: e.target.value })} /></Field>
        </div>
      </div>
      <div className="min-w-0 rounded-2xl border border-line bg-brand-50/60 p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="!m-0 !text-base">{!categoryId ? "Select Category" : !ownershipFilter ? "Select Ownership" : categoryId === "*" ? "All items" : db.categories.find(c => c.id === categoryId)?.name || "Items"}</h2>
          {categoryId && <button type="button" className="btn-quiet !min-h-11" onClick={() => ownershipFilter ? setOwnershipFilter("") : setCategoryId("")}><ArrowLeft size={16} />{ownershipFilter ? "Ownership" : "Categories"}</button>}
        </div>
        {!categoryId ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{db.categories.filter(c => c.active).map(c => <button key={c.id} type="button" className="category-tile" onClick={() => { setCategoryId(c.id); setOwnershipFilter(""); }}>
          <span className="flex size-[72px] shrink-0 items-center justify-center bg-white"><CategoryGlyph name={c.name} size={26} className="size-12 rounded-xl" /></span>
          <span className="flex min-h-[72px] flex-1 items-center bg-brand-600 px-3 text-sm font-semibold text-white">{c.name}</span>
        </button>)}<button type="button" className="category-tile" onClick={() => { setCategoryId("*"); setOwnershipFilter(""); }}><span className="flex size-[72px] shrink-0 items-center justify-center bg-white text-muted">All</span><span className="flex min-h-[72px] flex-1 items-center bg-brand-700 px-3 text-sm font-semibold text-white">All items</span></button></div>
        : !ownershipFilter ? <div className="grid grid-cols-1 gap-3">
          <button type="button" className="category-tile" onClick={() => setOwnershipFilter("customer")}>
            <span className="flex size-[72px] shrink-0 items-center justify-center bg-white text-brand-500"><PackageCheck size={26} /></span>
            <span className="flex min-h-[72px] flex-1 items-center bg-brand-600 px-3 text-sm font-semibold text-white">Customer-owned</span>
          </button>
          <button type="button" className="category-tile" onClick={() => setOwnershipFilter("pool")}>
            <span className="flex size-[72px] shrink-0 items-center justify-center bg-white text-pool-600"><Layers3 size={26} /></span>
            <span className="flex min-h-[72px] flex-1 items-center bg-pool-600 px-3 text-sm font-semibold text-white">Laundry Pool</span>
          </button>
        </div>
        : <div className="grid grid-cols-1 gap-3">{available.map(({ item, ownership, id }) => <button key={id} className={`group min-h-[88px] justify-start gap-3 p-3 text-left ${ownership === "customer" ? "item-own" : "item-pool"}`} onClick={() => setSelection({ item, ownership })}>
          {item.image ? <img className="size-14 shrink-0 rounded-xl object-cover" src={item.image} alt="" /> : <CategoryGlyph name={db.categories.find(c => c.id === item.categoryId)?.name} size={22} className={`size-14 rounded-xl ${ownership === "customer" ? "bg-white text-brand-500" : "bg-white text-pool-600"}`} />}
          <span className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-normal text-muted">{item.code}</span><span className="mb-2 block text-sm font-semibold">{item.name}</span><OwnershipBadge ownership={ownership} /></span>
          <Plus size={18} className={ownership === "customer" ? "text-brand-600" : "text-pool-600"} />
        </button>)}
        {!available.length && <p>No matching assigned linen. Go back and choose the other ownership, or ask an Admin to configure it in Linen Setup.</p>}</div>}
      </div>
    </div>

    <div className="sticky bottom-3 z-10 mt-6 space-y-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Cart number"><input value={cart.reference || draft.number || "Unsaved"} readOnly /></Field>
        <Field label={`Tare (${cart.weightUnit})`}><input type="number" min={0} step="any" value={cart.tare ?? ""} onChange={e => updateCart({ tare: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
        <Field label={`Gross (${cart.weightUnit})`}><input type="number" min={0} step="any" value={cart.gross ?? ""} onChange={e => updateCart({ gross: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
        <Field label="Net weight"><input readOnly value={net ? `${net} ${cart.weightUnit}` : "—"} /></Field>
        <Field label="Shipping date *"><input type="date" required value={draft.shippingDate} onChange={e => update({ shippingDate: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => save(false)}><Save size={18} />Save Draft</button>
        <button className="btn-primary" onClick={() => { const problems = dispatchErrors(db, draft, true); setErrors(problems); if (!problems.length) setConfirming(true); }}><Check size={18} />Confirm Dispatch</button>
        <button onClick={() => onPreview(draft)}><Printer size={18} />Print Preview</button>
        <button className="sm:ml-auto" disabled={draft.carts.length === 1} onClick={() => { if (window.confirm("Remove this cart and all its lines?")) { const carts = draft.carts.filter(c => c.id !== cart.id); update({ carts }); setCartId(carts[0].id); } }}>Remove Cart</button>
      </div>
    </div>

    <details className="mt-4"><summary>Dispatch notes, route and extra details</summary>
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <Field label="Route/reference"><input value={draft.route} onChange={e => update({ route: e.target.value })} /></Field>
        <Field label="Weight unit"><select value={cart.weightUnit} onChange={e => updateCart({ weightUnit: e.target.value as WeightUnit })}><option value="kg">kg</option><option value="lb">lb</option></select></Field>
        <Field label="Dispatch notes"><textarea rows={2} value={draft.notes} onChange={e => update({ notes: e.target.value })} /></Field>
        <p className="!m-0 self-end"><button type="button" onClick={() => updateCart({ tare: null, gross: null })}>Clear Weighing</button></p>
      </div>
    </details>
    <h2>Dispatch summary · all carts</h2><QuantitySummary records={[draft]} />

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
