"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Category, Item, Method, Ownership } from "../lib/types";
import { log, ownerLabel, uid } from "../lib/domain";
import { ActiveBadge, Dialog, Errors, Field, imageUpload, MasterProps, OwnershipBadge, ReadOnlyNotice } from "./shared";

export default function LinenSetup({ db, role, mutate, view }: MasterProps & { view: "categories" | "items" | "customer-linen" | "pool-linen" }) {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState(db.customers.find(c => c.active)?.id || "");
  const admin = role === "Admin";
  const title = { categories: "Categories", items: "Item Catalogue", "customer-linen": "Customer-owned Linen", "pool-linen": "Laundry Pool Linen" }[view];
  const ownership: Ownership = view === "customer-linen" ? "customer" : "pool";
  const ownerId = ownership === "customer" ? customerId : null;
  const filteredItems = db.items.filter(i => (showInactive || i.active) && `${i.code} ${i.name}`.toLowerCase().includes(search.toLowerCase()));
  function saveItem() {
    if (!item) return;
    const i = { ...item, code: item.code.trim().toUpperCase(), name: item.name.trim(), bundleSize: item.methods.includes("bundles") ? item.bundleSize : null };
    const validation: string[] = [];
    if (!i.code || !i.name || !i.categoryId) validation.push("Code, name and category are required.");
    if (!i.methods.length || !i.methods.includes(i.defaultMethod)) validation.push("Choose at least one allowed method and an allowed default method.");
    if (i.methods.includes("bundles") && (!i.bundleSize || !Number.isSafeInteger(i.bundleSize) || i.bundleSize < 1)) validation.push("A positive whole-number default bundle size is required.");
    if (validation.length) return setErrors(validation);
    if (mutate(state => {
      if (!admin) throw new Error("Admin access is required.");
      if (state.items.some(x => x.id !== i.id && x.code.toLowerCase() === i.code.toLowerCase())) throw new Error("Item code must be unique.");
      if (!state.categories.some(c => c.id === i.categoryId)) throw new Error("Select a valid category.");
      const index = state.items.findIndex(x => x.id === i.id);
      if (index < 0) state.items.push(i); else state.items[index] = i;
      log(state, role, "Catalogue item saved", `${i.code}: ${i.name}`);
    }, "Catalogue item saved. Configure ownership in Customer-owned Linen or Laundry Pool Linen.")) setItem(null);
  }
  function toggleAssignment(itemId: string, enabled: boolean) {
    mutate(state => {
      if (!admin) throw new Error("Admin access is required.");
      if (ownership === "customer" && !state.customers.some(c => c.id === ownerId && c.active)) throw new Error("Select an active customer.");
      const existing = state.assignments.find(a => a.itemId === itemId && a.ownership === ownership && a.customerId === ownerId);
      if (existing) existing.active = enabled;
      else state.assignments.push({ id: uid(), itemId, customerId: ownerId, ownership, active: enabled });
      log(state, role, "Ownership assignment changed", `${state.items.find(i => i.id === itemId)?.code}: ${ownerLabel(ownership)} ${ownership === "customer" ? state.customers.find(c => c.id === ownerId)?.name : ""} ${enabled ? "enabled" : "deactivated"}`);
    }, "Ownership assignment updated.");
  }
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="!mb-2">{title}</h1><p className="!mt-0 !text-xs">{view === "categories" ? "Keep your linen organised into simple, familiar groups." : view === "items" ? "One shared catalogue. Clear methods, bundle sizes, and item details." : "The right linen, assigned to the right owner."}</p></div>
    {view === "categories" && <button className="btn-primary" disabled={!admin} onClick={() => { setErrors([]); setCategory({ id: uid(), name: "", active: true }); }}><Plus size={15} />Create Category</button>}
    {view === "items" && <button className="btn-primary" disabled={!admin} onClick={() => { setErrors([]); setItem({ id: uid(), code: "", name: "", categoryId: "", methods: ["pieces"], defaultMethod: "pieces", bundleSize: null, image: "", active: true }); }}><Plus size={15} />Create Item</button>}</div>
    <ReadOnlyNotice role={role} />
    <div className="page-toolbar">
    <Field label="Search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder={view === "categories" ? "Category name" : "Item code or name"} /></Field>
    <p><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive records</label></p></div>
    {view === "categories" && <>
      <div className="table-scroll"><table><thead><tr><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {db.categories.filter(c => (showInactive || c.active) && c.name.toLowerCase().includes(search.toLowerCase())).map(c => <tr key={c.id}><td>{c.name}</td><td>{<ActiveBadge active={c.active} />}</td><td><button disabled={!admin} onClick={() => { setErrors([]); setCategory({ ...c }); }}>Edit</button>{" "}<button disabled={!admin} onClick={() => {
          if (!window.confirm(`${c.active ? "Deactivate" : "Reactivate"} category ${c.name}?`)) return;
          mutate(state => { if (!admin) throw new Error("Admin access required."); state.categories.find(x => x.id === c.id)!.active = !c.active; log(state, role, "Category status changed", c.name); }, "Category status updated.");
        }}>{c.active ? "Deactivate" : "Reactivate"}</button></td></tr>)}
      </tbody></table></div>
    </>}
    {view === "items" && <>
      <div className="table-scroll"><table><thead><tr><th>Code</th><th>Item</th><th>Category</th><th>Allowed methods</th><th>Default method</th><th>Bundle size</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {filteredItems.map(i => <tr key={i.id}><td>{i.code}</td><td>{i.image && <img src={i.image} width={48} height={48} alt="" />} {i.name}</td><td>{db.categories.find(c => c.id === i.categoryId)?.name}</td><td>{i.methods.join(", ")}</td><td>{i.defaultMethod}</td><td>{i.bundleSize ? `${i.bundleSize} pieces/bundle` : "—"}</td><td>{<ActiveBadge active={i.active} />}</td><td><button disabled={!admin} onClick={() => { setErrors([]); setItem({ ...i, methods: [...i.methods] }); }}>Edit</button>{" "}<button disabled={!admin} onClick={() => {
          if (!window.confirm(`${i.active ? "Deactivate" : "Reactivate"} ${i.code}? Historical documents will be retained.`)) return;
          mutate(state => { if (!admin) throw new Error("Admin access required."); state.items.find(x => x.id === i.id)!.active = !i.active; log(state, role, "Item status changed", i.code); }, "Item status updated.");
        }}>{i.active ? "Deactivate" : "Reactivate"}</button></td></tr>)}
      </tbody></table></div>{!filteredItems.length && <p>No items match. Create an item or change the filters.</p>}
    </>}
    {(view === "customer-linen" || view === "pool-linen") && <>
      <p>{ownership === "customer" ? "Assign catalogue items owned by this customer. These can only be dispatched to that customer." : "Enable catalogue items owned by the laundry. Pool linen can be issued to any active customer."} An item can be configured for both ownership types.</p>
      {ownership === "customer" && <Field label="Customer"><select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Select customer</option>{db.customers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></Field>}
      <div className="table-scroll"><table><thead><tr><th>Code</th><th>Item</th><th>Ownership</th><th>Assignment</th></tr></thead><tbody>{filteredItems.map(i => {
        const assigned = db.assignments.some(a => a.itemId === i.id && a.ownership === ownership && a.customerId === ownerId && a.active);
        return <tr key={i.id}><td>{i.code}</td><td>{i.name}{!i.active && " (inactive item)"}</td><td><OwnershipBadge ownership={ownership} /></td><td><label><input type="checkbox" aria-label={`Assign ${i.code} to ${ownerLabel(ownership)}`} checked={assigned} disabled={!admin || !i.active || (ownership === "customer" && !customerId)} onChange={e => toggleAssignment(i.id, e.target.checked)} /> {assigned ? "Assigned" : "Not assigned"}</label></td></tr>;
      })}</tbody></table></div>{!filteredItems.length && <p>No catalogue items match. Create items in Item Catalogue first.</p>}
    </>}
    {category && <Dialog title="Category" onClose={() => setCategory(null)}><Errors errors={errors} /><form onSubmit={e => {
      e.preventDefault(); const name = category.name.trim(); if (!name) return setErrors(["Enter a category name."]);
      if (mutate(state => {
        if (!admin) throw new Error("Admin access required.");
        if (state.categories.some(c => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase())) throw new Error("Category name must be unique.");
        const index = state.categories.findIndex(c => c.id === category.id);
        const record = { ...category, name }; if (index < 0) state.categories.push(record); else state.categories[index] = record;
        log(state, role, "Category saved", name);
      }, "Category saved.")) setCategory(null);
    }}><Field label="Category name *"><input required value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} /></Field><button type="submit">Save Category</button></form></Dialog>}
    {item && <Dialog title={db.items.some(i => i.id === item.id) ? "Edit Item" : "Create Item"} onClose={() => setItem(null)}>
      <Errors errors={errors} /><form onSubmit={e => { e.preventDefault(); saveItem(); }}>
        <Field label="Unique item code *"><input required value={item.code} onChange={e => setItem({ ...item, code: e.target.value })} /></Field>
        <Field label="Item name *"><input required value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} /></Field>
        <Field label="Category *"><select required value={item.categoryId} onChange={e => setItem({ ...item, categoryId: e.target.value })}><option value="">Select category</option>{db.categories.filter(c => c.active || c.id === item.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}{!c.active && " (inactive)"}</option>)}</select></Field>
        <fieldset><legend>Allowed quantity methods *</legend>{(["pieces", "bundles", "weight"] as Method[]).map(method => <label key={method}><input type="checkbox" checked={item.methods.includes(method)} onChange={e => {
          const methods = e.target.checked ? [...item.methods, method] : item.methods.filter(m => m !== method);
          setItem({ ...item, methods, defaultMethod: methods.includes(item.defaultMethod) ? item.defaultMethod : methods[0] || "pieces" });
        }} /> {method}{" "}</label>)}</fieldset>
        <Field label="Default quantity method *"><select value={item.defaultMethod} onChange={e => setItem({ ...item, defaultMethod: e.target.value as Method })}>{item.methods.map(method => <option key={method}>{method}</option>)}</select></Field>
        {item.methods.includes("bundles") && <Field label="Default pieces per bundle *"><input required type="number" min={1} step={1} value={item.bundleSize ?? ""} onChange={e => setItem({ ...item, bundleSize: e.target.value === "" ? null : Number(e.target.value) })} /></Field>}
        <Field label="Optional image (PNG/JPEG/WebP, under 300 KB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) imageUpload(f, image => { setItem({ ...item, image }); setErrors([]); }, error => setErrors([error])); }} /></Field>
        {item.image && <p><img src={item.image} width={80} alt="Item preview" /><button type="button" onClick={() => setItem({ ...item, image: "" })}>Remove Image</button></p>}
        <p><label><input type="checkbox" checked={item.active} onChange={e => setItem({ ...item, active: e.target.checked })} /> Active</label></p>
        <button type="submit">Save Item</button>
      </form>
    </Dialog>}
  </section>;
}
