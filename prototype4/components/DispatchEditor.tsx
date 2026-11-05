"use client";
import { useRef, useState } from "react";
import { ArrowLeft, Check, Delete, FileText, LayoutGrid, List, MapPin, MessageSquare, PackageOpen, Pencil, Plus, Printer, Save, Search, Trash2, UsersRound } from "lucide-react";
import type { Cart, Database, Dispatch, Item, Line, Ownership, Unit, WeightUnit } from "../lib/types";
import { dispatchErrors, fmt, lineErrors, newCart, normalizeLine, uid } from "../lib/domain";
import { convertOutgoingCartUnit, outgoingCartNumber } from "../lib/outgoing";
import ReceivingKeypad from "./ReceivingKeypad";
import { CategoryGlyph, Dialog, Errors, Field, OwnershipBadge, QuantitySummary, StatusBadge } from "./shared";

interface Props {
  db: Database; draft: Dispatch; onChange: (draft: Dispatch) => void;
  onSave: (draft: Dispatch, confirm: boolean) => Dispatch | undefined;
  onPreview: (record: Dispatch) => void; onOpen: (record: Dispatch) => void; onBack: () => void;
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
  const [accumulator, setAccumulator] = useState(0);
  const [replace, setReplace] = useState(true);
  const units = item.methods.flatMap(method => method === "weight" ? ["kg", "lb"] : [method]) as Unit[];
  function submit() {
    const result = normalizeLine({ id: line?.id || uid(), itemId: item.id, code: item.code, description: item.name,
      ownership, ownerCustomerId: ownership === "customer" ? customerId : null, quantity: accumulator + Number(quantity || 0), unit,
      bundleSize: unit === "bundles" ? Number(bundleSize) : null, equivalentPieces: null });
    const errors = lineErrors(result);
    if (!units.includes(unit)) errors.push("Choose a currently allowed unit.");
    if (errors.length) return setErrors(errors);
    onSubmit(result);
  }
  function key(value: string) {
    setErrors([]);
    if (value === "Backspace") { setQuantity(q => q.slice(0, -1)); setReplace(false); return; }
    if (value === "+") { setAccumulator(a => a + Number(quantity || 0)); setQuantity(""); setReplace(false); return; }
    if (value === "=") { setQuantity(String(accumulator + Number(quantity || 0))); setAccumulator(0); setReplace(true); return; }
    const current = replace ? "" : quantity;
    if (value === "." && (current.includes(".") || unit === "pieces" || unit === "bundles")) return;
    setQuantity(value === "." && !current ? "0." : current + value); setReplace(false);
  }
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return <Dialog className="keypad-dialog incoming-keypad" title={line ? "Edit Quantity" : "Add Quantity"} onClose={onClose}
    badge={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${ownership === "customer" ? "bg-brand-500 text-white" : "bg-pool-600 text-white"}`}>{item.name}</span>}>
    <form className="!gap-0" onSubmit={e => { e.preventDefault(); submit(); }}>
      <div className="space-y-3 px-5 py-4">
        <OwnershipBadge ownership={ownership} />
        <Errors errors={errors} />
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="rounded-xl border border-line bg-canvas px-4 py-4 text-center text-4xl font-semibold tracking-tight"><small className="block text-xs text-muted">{accumulator ? `${accumulator} +` : ""}</small><output aria-label="Keypad value" aria-live="polite">{quantity || "0"}</output></div>
          <button type="button" className="!size-[72px] !min-h-[72px] !rounded-xl !bg-ink !p-0 !text-white hover:!bg-slate-700" aria-label="Backspace" onClick={() => key("Backspace")}><Delete size={26} /></button>
        </div>
        <div className="flex flex-wrap gap-2">{units.map(u => <button key={u} type="button" className={unit === u ? "btn-primary" : ""} onClick={() => { setUnit(u); setAccumulator(0); }}>{u}</button>)}</div>
        {unit === "bundles" && <>
          <Field label="Pieces per bundle used *"><input type="number" required min={1} step={1} value={bundleSize} onChange={e => setBundleSize(e.target.value)} /></Field>
          <p role="status" className="!my-0">{quantity || "0"} bundles × {bundleSize || "0"} pieces = <strong>{fmt(Number(quantity) * Number(bundleSize))} equivalent pieces</strong></p>
        </>}
      </div>
      <div role="group" aria-label="Numeric keypad" className="keypad-grid">
        {keys.map(value => <button key={value} type="button" className="keypad-key" aria-label={`Key ${value}`} onClick={() => key(value)}>{value}</button>)}
        <button type="button" className="keypad-key !text-lg" aria-label="Key +" onClick={() => key("+")}>+</button>
        <button type="button" className="keypad-key" aria-label="Key 0" onClick={() => key("0")}>0</button>
        <button type="button" className="keypad-key" aria-label={unit === "pieces" || unit === "bundles" ? "Key =" : "Decimal"} onClick={() => key(unit === "pieces" || unit === "bundles" ? "=" : ".")}>{unit === "pieces" || unit === "bundles" ? "=" : "."}</button>
      </div>
      <button type="submit" className="btn-primary keypad-enter">{line ? "Update" : "Enter"}</button>
    </form>
  </Dialog>;
}

export function LineTable({ cart, editable = false, onEdit, onRemove }: { cart: Cart; editable?: boolean; onEdit?: (line: Line) => void; onRemove?: (id: string) => void }) {
  return <div className="table-scroll !my-0"><table><caption className="px-4 pt-3">Selected items · {cart.reference || "No cart reference"}</caption>
    <thead><tr><th>Item code</th><th>Item</th><th>Ownership</th><th>Quantity</th><th>Unit</th>{editable && <th>Action</th>}</tr></thead>
    <tbody>{cart.lines.map(line => <tr key={line.id}><td className="font-medium">{line.code}</td><td>{line.description}</td><td><OwnershipBadge ownership={line.ownership} /></td><td className="font-semibold">{fmt(line.quantity)}</td><td>{line.unit}</td>{editable && <td><div className="flex gap-1"><button onClick={() => onEdit?.(line)}><Pencil size={14} />Edit</button><button className="btn-danger" onClick={() => onRemove?.(line.id)}><Trash2 size={14} /><span className="sr-only">Remove {line.description}</span></button></div></td>}</tr>)}</tbody>
  </table></div>;
}

export default function DispatchEditor({ db, draft, onChange, onSave, onPreview, onOpen, onBack }: Props) {
  const [cartId, setCartId] = useState(draft.carts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("customer");
  const [selection, setSelection] = useState<QuantitySelection | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [manifest, setManifest] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [commenting, setCommenting] = useState(false);
  const [pad, setPad] = useState<null | "tare" | "gross">(null);
  const busy = useRef(false);
  const cart = draft.carts.find(c => c.id === cartId) || draft.carts[0];
  const customer = db.customers.find(c => c.id === draft.customerId);
  const site = db.sites.find(s => s.id === draft.siteId);
  const update = (patch: Partial<Dispatch>) => { onChange({ ...draft, ...patch }); setErrors([]); };
  const updateCart = (patch: Partial<Cart>) => update({ carts: draft.carts.map(c => c.id === cart.id ? { ...c, ...patch } : c) });
  const routes = [...new Set(db.sites.filter(s => s.active && s.route).map(s => s.route))].sort();
  const customers = db.customers.filter(c => (c.active || c.id === draft.customerId) && `${c.name} ${c.code}`.toLowerCase().includes(customerQuery.toLowerCase()) && (!routeFilter || db.sites.some(s => s.customerId === c.id && s.active && s.route === routeFilter)));
  const sites = db.sites.filter(s => s.customerId === draft.customerId && (s.active || s.id === draft.siteId));
  const eligible = db.assignments.filter(a => a.active && (a.ownership === "pool" ? a.customerId === null : a.customerId === draft.customerId)).flatMap(a => {
    const item = db.items.find(i => i.id === a.itemId && i.active && db.categories.some(c => c.id === i.categoryId && c.active));
    return item ? [{ item, ownership: a.ownership, id: a.id }] : [];
  });
  const categories = db.categories.filter(c => c.active && eligible.some(a => a.item.categoryId === c.id));
  const available = eligible.filter(a => a.ownership === ownership && (!categoryId || categoryId === "*" || a.item.categoryId === categoryId) && `${a.item.name} ${a.item.code}`.toLowerCase().includes(search.toLowerCase())).filter((a, i, all) => all.findIndex(b => b.item.id === a.item.id && b.ownership === a.ownership) === i);
  const showItems = !!categoryId || !!search;
  const net = cart.tare !== null && cart.gross !== null ? Number((cart.gross - cart.tare).toFixed(8)) : null;
  const cartNumber = (c: Cart) => outgoingCartNumber(db, draft, c);
  function changeCustomer(customerId: string) {
    if (draft.customerId === customerId) return;
    if (draft.carts.some(c => c.lines.length || c.gross !== null || c.tare !== null || c.comments) && !window.confirm("Change customer and clear this dispatch's carts? Saved records will stay unchanged.")) return;
    const active = db.sites.filter(s => s.customerId === customerId && s.active);
    const only = active.length === 1 ? active[0] : undefined;
    const first = newCart(db.company.defaultWeightUnit);
    update({ customerId, siteId: only?.id || "", route: only?.route || "", carts: [first] });
    setCartId(first.id); setCategoryId(""); setSearch(""); setCustomerQuery(""); setOwnership("customer");
  }
  function chooseItem(item: Item, owner: Ownership) {
    const existing = cart.lines.filter(l => l.itemId === item.id && l.ownership === owner);
    // Repeated taps edit the existing item instead of silently duplicating it.
    setSelection({ item, ownership: owner, line: existing.length === 1 ? existing[0] : undefined });
  }
  function save(print = false) {
    if (busy.current) return;
    const problems = dispatchErrors(db, draft, true); setErrors(problems);
    if (problems.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    busy.current = true;
    try { const saved = onSave(draft, false); if (saved) { setErrors([]); if (print) onPreview(saved); } }
    finally { busy.current = false; }
  }
  function reviewManifest() {
    const problems = dispatchErrors(db, draft, true); setErrors(problems);
    if (problems.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setManifest(true);
  }
  function prepareManifest(print: boolean) {
    if (busy.current) return;
    const problems = dispatchErrors(db, draft, true); setErrors(problems);
    if (problems.length) return;
    busy.current = true;
    try { const saved = onSave(draft, true); if (saved) { setManifest(false); onOpen(saved); if (print) onPreview(saved); } }
    finally { busy.current = false; }
  }
  function addCart() {
    const added = newCart(cart.weightUnit); update({ carts: [...draft.carts, added] }); setCartId(added.id); setSelection(null);
  }
  function back() {
    if (manifest) { setManifest(false); return; }
    if (site) { update({ siteId: "" }); return; }
    if (customer) { changeCustomer(""); return; }
    onBack();
  }
  return <section className="incoming-screen outgoing-screen">
    <div className="incoming-topbar"><div><h1>{manifest ? "Create Shipping Manifest" : !customer ? "Outgoing Carts" : !site ? "Select Delivery Site" : "Create Outgoing Carts"}</h1>{customer && <button className="incoming-customer-chip" onClick={() => changeCustomer("")}><UsersRound size={15} /><span>{customer.name}</span></button>}{site && <span className="incoming-site-chip"><MapPin size={14} />{site.name}</span>}</div>
      <div className="incoming-top-actions">{!customer && <><select aria-label="Filter outgoing customers by route" value={routeFilter} onChange={e => setRouteFilter(e.target.value)}><option value="">All routes</option>{routes.map(r => <option key={r}>{r}</option>)}</select><input type="search" aria-label="Search dispatch customers" placeholder="Search customer" value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} /></>}{site && !manifest && <div className="incoming-layout-toggle" aria-label="Item display"><button aria-label="Grid view" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={19} /></button><button aria-label="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={20} /></button></div>}<button onClick={back}><ArrowLeft size={17} />Back</button></div>
    </div>
    <Errors errors={errors} />
    {!customer && <div className="incoming-panel"><div className="incoming-panel-title"><h2>Select Customer</h2></div><div className="incoming-customer-grid">{customers.map(c => <button className="incoming-choice customer-choice" key={c.id} onClick={() => changeCustomer(c.id)}><span className="incoming-choice-image"><UsersRound size={34} strokeWidth={1.4} /></span><span className="incoming-choice-label"><strong>{c.name}</strong><small>{c.code} · {db.sites.filter(s => s.active && s.customerId === c.id).length} sites</small></span></button>)}</div>{!customers.length && <div className="incoming-empty"><p>No matching customers. Try another name or route.</p></div>}</div>}
    {customer && !site && <div className="incoming-panel"><div className="incoming-panel-title"><h2>Select Delivery Site / Department</h2></div><div className="incoming-customer-grid">{sites.map(s => <button className="incoming-choice customer-choice" key={s.id} onClick={() => update({ siteId: s.id, route: s.route || "" })}><span className="incoming-choice-image"><MapPin size={34} strokeWidth={1.4} /></span><span className="incoming-choice-label"><strong>{s.name}</strong><small>{s.department || s.address}</small></span></button>)}</div>{!sites.length && <div className="incoming-empty"><p>No active delivery sites. Ask the laundry owner to add one for this customer.</p></div>}</div>}
    {customer && site && !manifest && <>
      <div className="outgoing-cart-tabs"><div role="tablist" aria-label="Outgoing carts">{draft.carts.map(c => <button key={c.id} role="tab" aria-selected={cart.id === c.id} onClick={() => setCartId(c.id)}>Cart {cartNumber(c)}<small>{c.lines.length} items</small></button>)}</div><button onClick={addCart}><Plus size={17} />Add Cart</button>{draft.number && <span className="outgoing-saved-label">{draft.number} · Draft</span>}</div>
      <div className="incoming-workspace"><div className="incoming-panel incoming-selected-panel"><div className="incoming-panel-title outgoing-items-heading"><h2>Select Items</h2><div><button onClick={() => setCommenting(true)}><MessageSquare size={16} />{cart.comments ? "Edit Comment" : "Add Comment"}</button><button className="btn-primary" onClick={reviewManifest}><FileText size={16} />Create Manifest</button></div></div><div className="incoming-selected-content">
        <div className="incoming-table-scroll"><table className="incoming-items-table"><thead><tr><th>Item No.</th><th>Item</th><th>Quantity</th><th><span className="sr-only">Remove item</span></th></tr></thead><tbody>{cart.lines.map(line => <tr key={line.id}><td>{line.code}</td><td>{line.description}<small className={`outgoing-owner ${line.ownership}`}>{line.ownership === "customer" ? "Customer-owned" : "Laundry Pool"}</small></td><td><button className="incoming-quantity outgoing-quantity" aria-label={`Quantity for ${line.description} (${line.ownership === "customer" ? "Customer-owned" : "Laundry Pool"})`} onClick={() => { const item = db.items.find(i => i.id === line.itemId); if (item) setSelection({ item, ownership: line.ownership, line }); else setErrors(["This item no longer exists. Remove its row."]); }}><strong>{fmt(line.quantity)}</strong><small>{line.unit}{line.unit === "bundles" ? ` × ${line.bundleSize}` : ""}</small></button></td><td><button className="incoming-remove" aria-label={`Remove ${line.description} (${line.ownership})`} onClick={() => updateCart({ lines: cart.lines.filter(l => l.id !== line.id) })}><Trash2 size={19} /></button></td></tr>)}</tbody></table></div>
        {!cart.lines.length && <div className="incoming-empty"><PackageOpen size={40} strokeWidth={1.3} /><p>No items added yet.</p><small>Choose a category and tap an item.</small></div>}
        {!!cart.lines.length && <div className="incoming-cart-count"><span>{cart.lines.length} {cart.lines.length === 1 ? "item" : "items"}</span><strong>{fmt(cart.lines.reduce((n, l) => n + (l.equivalentPieces || 0), 0))} pieces</strong>{(["kg", "lb"] as const).map(u => { const weight = cart.lines.filter(l => l.unit === u).reduce((n, l) => n + l.quantity, 0); return weight ? <span key={u}>{fmt(weight)} {u} linen</span> : null; })}</div>}
        {cart.comments && <p className="outgoing-comment"><MessageSquare size={14} />{cart.comments}</p>}
      </div></div>
      <div className="incoming-panel incoming-catalogue"><div className="incoming-panel-title"><h2>{!showItems ? "Select Category" : categoryId && categoryId !== "*" ? db.categories.find(c => c.id === categoryId)?.name : "Items"}</h2></div><div className="incoming-catalogue-content">
        <div className="incoming-catalogue-toolbar">{showItems && <button onClick={() => { setCategoryId(""); setSearch(""); }}><ArrowLeft size={16} />Item Categories</button>}<label><Search size={16} /><input type="search" aria-label="Search outgoing linen items" placeholder="Search item no. or name" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
        {showItems && <div className="outgoing-ownership" aria-label="Linen ownership"><button aria-pressed={ownership === "customer"} onClick={() => setOwnership("customer")}>Customer-owned</button><button aria-pressed={ownership === "pool"} onClick={() => setOwnership("pool")}>Laundry Pool</button></div>}
        <div className={`incoming-choice-grid ${layout === "list" ? "is-list" : ""}`}>{!showItems ? <>{categories.map(c => <button className="incoming-choice" key={c.id} onClick={() => setCategoryId(c.id)}><span className="incoming-choice-image"><CategoryGlyph name={c.name} size={32} className="size-14 rounded-xl" /></span><span className="incoming-choice-label"><strong>{c.name}</strong></span></button>)}{categories.length > 1 && <button className="incoming-choice" onClick={() => setCategoryId("*")}><span className="incoming-choice-image"><LayoutGrid size={30} /></span><span className="incoming-choice-label"><strong>All Items</strong></span></button>}</> : available.map(({ item, ownership: owner, id }) => <button className={`incoming-choice ${cart.lines.some(l => l.itemId === item.id && l.ownership === owner) ? "is-added" : ""}`} key={id} onClick={() => chooseItem(item, owner)}><span className="incoming-choice-image">{item.image ? <img src={item.image} alt="" /> : <CategoryGlyph name={db.categories.find(c => c.id === item.categoryId)?.name} size={30} className="size-14 rounded-xl" />}</span><span className="incoming-choice-label"><strong>{item.name}</strong><small>{item.code}</small></span></button>)}</div>
        {(showItems ? !available.length : !categories.length) && <div className="incoming-empty"><p>No matching assigned linen. Try the other ownership or ask the laundry owner to check linen setup.</p></div>}
      </div></div></div>
      <div className="incoming-bottom-bar outgoing-bottom-bar"><Field label="Cart Number (Auto)"><output className="incoming-net" aria-label="Outgoing cart number">{cartNumber(cart)}</output></Field><Field label={`Tare Weight (${cart.weightUnit})`}><button className="keypad-field" onClick={() => setPad("tare")}>{cart.tare === null ? "Tap to enter" : fmt(cart.tare)}</button></Field><Field label={`Gross Weight (${cart.weightUnit})`}><button className="keypad-field" onClick={() => setPad("gross")}>{cart.gross === null ? "Tap to enter" : fmt(cart.gross)}</button></Field><Field label={`Net Weight (${cart.weightUnit})`}><output className={`incoming-net ${net !== null && net < 0 ? "invalid" : ""}`} aria-label="Net outgoing cart weight" aria-live="polite">{net === null ? "—" : fmt(net)}</output></Field><Field label="Shipping Date *"><input type="date" value={draft.shippingDate} onChange={e => update({ shippingDate: e.target.value })} /></Field><button className="incoming-save" onClick={() => save()}><Save size={18} />Save</button><button className="btn-primary" onClick={() => save(true)}><Printer size={18} />Save & Print</button></div>
      <details className="incoming-extra"><summary>Route, notes & extra details</summary><div className="incoming-extra-fields"><Field label="Cart weight unit"><select aria-label="Outgoing cart weight unit" value={cart.weightUnit} onChange={e => updateCart(convertOutgoingCartUnit(cart, e.target.value as WeightUnit))}><option value="kg">kg</option><option value="lb">lb</option></select></Field><Field label="Route"><input value={draft.route} onChange={e => update({ route: e.target.value })} /></Field><Field label="Legacy cart reference"><input value={cart.reference} readOnly placeholder="Assigned automatically on save" /></Field><Field label="Dispatch notes"><textarea value={draft.notes} onChange={e => update({ notes: e.target.value })} /></Field><button onClick={() => updateCart({ tare: null, gross: null })}>Clear cart weighing</button><button disabled={draft.carts.length === 1} onClick={() => { if (window.confirm("Remove this cart and its items from this draft?")) { const remaining = draft.carts.filter(c => c.id !== cart.id); update({ carts: remaining }); setCartId(remaining[0].id); } }}>Remove Cart</button></div></details>
    </>}
    {customer && site && manifest && <div className="outgoing-manifest-review"><div className="incoming-panel"><div className="incoming-panel-title"><h2>Review Outgoing Carts</h2><span>{draft.carts.length} carts included</span></div><div className="outgoing-manifest-body"><p><strong>{customer.code} · {customer.name}</strong><br />{site.name}{site.department ? ` · ${site.department}` : ""}<br />{site.address}</p><div className="outgoing-manifest-fields"><Field label="Shipping date"><input type="date" value={draft.shippingDate} onChange={e => update({ shippingDate: e.target.value })} /></Field><Field label="Manifest notes"><textarea value={draft.notes} onChange={e => update({ notes: e.target.value })} /></Field></div>{draft.carts.map(c => <div className="outgoing-review-cart" key={c.id}><h3>Cart {cartNumber(c)}</h3><LineTable cart={{ ...c, reference: cartNumber(c) }} />{c.tare !== null && c.gross !== null && <p>Tare {fmt(c.tare)} {c.weightUnit} · Gross {fmt(c.gross)} {c.weightUnit} · Net {fmt(c.gross - c.tare)} {c.weightUnit}</p>}{c.comments && <p>{c.comments}</p>}</div>)}<QuantitySummary records={[draft]} /><p>Save the manifest when packing is complete. It becomes ready for delivery and the item details are locked. Assign a driver in the next step.</p><div className="outgoing-manifest-actions"><button onClick={() => setManifest(false)}><ArrowLeft size={17} />Return to carts</button><button className="incoming-save" onClick={() => prepareManifest(false)}><Check size={17} />Save Manifest</button><button className="btn-primary" onClick={() => prepareManifest(true)}><Printer size={17} />Save & Print</button></div></div></div></div>}
    {pad && <ReceivingKeypad title={`${pad === "tare" ? "Tare" : "Gross"} Weight (${cart.weightUnit})`} decimal initial={String(cart[pad] ?? "")} onClose={() => setPad(null)} onEnter={value => { updateCart({ [pad]: value, ...(pad === "gross" && cart.tare === null ? { tare: 0 } : {}) }); setPad(null); }} />}
    {selection && <QuantityDialog key={`${selection.item.id}-${selection.ownership}-${selection.line?.id || "new"}`} selection={selection} customerId={draft.customerId} defaultWeightUnit={db.company.defaultWeightUnit} onClose={() => setSelection(null)} onSubmit={line => { updateCart({ lines: selection.line ? cart.lines.map(l => l.id === line.id ? line : l) : [...cart.lines, line] }); setSelection(null); }} />}
    {commenting && <CartComment initial={cart.comments} onClose={() => setCommenting(false)} onApply={comments => { updateCart({ comments }); setCommenting(false); }} />}
  </section>;
}

function CartComment({ initial, onClose, onApply }: { initial: string; onClose: () => void; onApply: (value: string) => void }) {
  const [comment, setComment] = useState(initial);
  return <Dialog title="Cart Comment" onClose={onClose}><Field label="Comment"><textarea autoFocus rows={4} value={comment} onChange={e => setComment(e.target.value)} /></Field><div className="outgoing-manifest-actions"><button onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onApply(comment)}>Apply Comment</button></div></Dialog>;
}
