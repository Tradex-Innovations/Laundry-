"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Customer, Site } from "../lib/types";
import { log, uid } from "../lib/domain";
import { ActiveBadge, Dialog, Errors, Field, MasterProps, ReadOnlyNotice } from "./shared";

const blankCustomer = (): Customer => ({ id: uid(), code: "", name: "", contact: "", phone: "", email: "", active: true });
const blankSite = (): Site => ({ id: uid(), customerId: "", name: "", department: "", address: "", route: "", active: true });

export default function Customers({ db, role, mutate, sitesOnly = false }: MasterProps & { sitesOnly?: boolean }) {
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [customerFilter, setCustomerFilter] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const admin = role === "Admin";
  const customerName = (id: string) => db.customers.find(c => c.id === id)?.name || "Unknown customer";
  const customerRows = db.customers.filter(c => (includeInactive || c.active) && `${c.code} ${c.name} ${c.contact} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase()));
  const siteRows = db.sites.filter(s => (includeInactive || s.active) && (!customerFilter || s.customerId === customerFilter) && `${customerName(s.customerId)} ${s.name} ${s.department} ${s.address}`.toLowerCase().includes(search.toLowerCase()));
  function toggleCustomer(c: Customer) {
    if (!window.confirm(`${c.active ? "Deactivate" : "Reactivate"} ${c.name}? Historical records will be retained.`)) return;
    mutate(state => {
      if (!admin) throw new Error("Admin access is required.");
      state.customers.find(x => x.id === c.id)!.active = !c.active;
      log(state, role, c.active ? "Customer deactivated" : "Customer reactivated", c.code);
    }, "Customer status updated.");
  }
  function saveCustomer() {
    if (!customer) return;
    const c = { ...customer, code: customer.code.trim().toUpperCase(), name: customer.name.trim() };
    if (!c.code || !c.name) return setErrors(["Customer code and name are required."]);
    if (mutate(state => {
      if (!admin) throw new Error("Admin access is required.");
      if (state.customers.some(x => x.id !== c.id && x.code.toLowerCase() === c.code.toLowerCase())) throw new Error("Customer code must be unique.");
      const index = state.customers.findIndex(x => x.id === c.id);
      if (index < 0) state.customers.push(c); else state.customers[index] = c;
      log(state, role, "Customer saved", `${c.code}: ${c.name}`);
    }, "Customer saved. Add delivery sites from Delivery Sites / Departments.")) setCustomer(null);
  }
  function saveSite() {
    if (!site) return;
    const s = { ...site, name: site.name.trim(), address: site.address.trim() };
    if (!s.customerId || !s.name || !s.address) return setErrors(["Customer, site name and delivery address are required."]);
    if (mutate(state => {
      if (!admin) throw new Error("Admin access is required.");
      if (!state.customers.some(c => c.id === s.customerId && c.active)) throw new Error("Select an active customer.");
      const index = state.sites.findIndex(x => x.id === s.id);
      if (index < 0) state.sites.push(s); else state.sites[index] = s;
      log(state, role, "Delivery site saved", `${customerName(s.customerId)}: ${s.name}`);
    }, "Delivery site saved.")) setSite(null);
  }
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="!mb-2">{sitesOnly ? "Delivery Sites / Departments" : "Customer List"}</h1><p className="!mt-0 !text-xs">{sitesOnly ? "Every delivery address, department, and customer connection." : "A little care for every customer. Keep their details up to date."}</p></div><button className="btn-primary" disabled={!admin} onClick={() => { setErrors([]); if (sitesOnly) setSite(blankSite()); else setCustomer(blankCustomer()); }}><Plus size={15} />Create {sitesOnly ? "Delivery Site" : "Customer"}</button></div>
    <ReadOnlyNotice role={role} />
    <div className="page-toolbar">
    <Field label="Search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder={sitesOnly ? "Customer, site or department" : "Code, name or contact"} /></Field>
    {sitesOnly && <Field label="Customer filter"><select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}><option value="">All customers</option>{db.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
    <p><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} /> Show inactive records</label></p></div>
    {!sitesOnly ? <div className="table-scroll"><table>
      <caption>Customers</caption><thead><tr><th>Code</th><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{customerRows.map(c => <tr key={c.id}>
        <td className="font-medium">{c.code}</td><td className="whitespace-nowrap font-medium">{c.name}</td><td>{c.contact || "—"}</td><td className="whitespace-nowrap">{c.phone || "—"}</td><td>{c.email || "—"}</td><td><ActiveBadge active={c.active} /></td>
        <td><button disabled={!admin} onClick={() => { setErrors([]); setCustomer({ ...c }); }}>Edit</button>{" "}<button disabled={!admin} onClick={() => toggleCustomer(c)}>{c.active ? "Deactivate" : "Reactivate"}</button>{" "}<button disabled={!admin || !c.active} onClick={() => { setErrors([]); setSite({ ...blankSite(), customerId: c.id }); }}>Add Site</button></td>
      </tr>)}</tbody>
    </table></div> : <div className="table-scroll"><table>
      <caption>Delivery sites and departments</caption><thead><tr><th>Customer</th><th>Site</th><th>Department</th><th>Address</th><th>Route/reference</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{siteRows.map(s => <tr key={s.id}>
        <td className="whitespace-nowrap font-medium">{customerName(s.customerId)}</td><td>{s.name}</td><td>{s.department || "—"}</td><td>{s.address}</td><td>{s.route || "—"}</td><td><ActiveBadge active={s.active} /></td>
        <td><button disabled={!admin} onClick={() => { setErrors([]); setSite({ ...s }); }}>Edit</button>{" "}<button disabled={!admin} onClick={() => {
          if (!window.confirm(`${s.active ? "Deactivate" : "Reactivate"} ${s.name}?`)) return;
          mutate(state => { if (!admin) throw new Error("Admin access required."); state.sites.find(x => x.id === s.id)!.active = !s.active; log(state, role, "Site status changed", s.name); }, "Site status updated.");
        }}>{s.active ? "Deactivate" : "Reactivate"}</button></td>
      </tr>)}</tbody>
    </table></div>}
    {(sitesOnly ? !siteRows.length : !customerRows.length) && <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center">{sitesOnly ? "No delivery sites match. Create a site or change your filters." : "No customers match. Create a customer or change your search."}</p>}
    {customer && <Dialog title={db.customers.some(c => c.id === customer.id) ? "Edit Customer" : "Create Customer"} onClose={() => setCustomer(null)}>
      <Errors errors={errors} /><form onSubmit={e => { e.preventDefault(); saveCustomer(); }}>
        <Field label="Customer code *"><input required autoFocus value={customer.code} onChange={e => setCustomer({ ...customer, code: e.target.value })} /></Field>
        <Field label="Name *"><input required value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /></Field>
        <Field label="Contact person"><input value={customer.contact} onChange={e => setCustomer({ ...customer, contact: e.target.value })} /></Field>
        <Field label="Phone"><input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /></Field>
        <Field label="Email"><input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} /></Field>
        <p><label><input type="checkbox" checked={customer.active} onChange={e => setCustomer({ ...customer, active: e.target.checked })} /> Active</label></p>
        <button type="submit">Save Customer</button>
      </form>
    </Dialog>}
    {site && <Dialog title={db.sites.some(s => s.id === site.id) ? "Edit Delivery Site" : "Create Delivery Site"} onClose={() => setSite(null)}>
      <Errors errors={errors} /><form onSubmit={e => { e.preventDefault(); saveSite(); }}>
        <Field label="Customer *"><select required value={site.customerId} disabled={db.sites.some(s => s.id === site.id)} onChange={e => setSite({ ...site, customerId: e.target.value })}><option value="">Select customer</option>{db.customers.filter(c => c.active || c.id === site.customerId).map(c => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactive)" : ""}</option>)}</select></Field>
        <Field label="Site name *"><input required value={site.name} onChange={e => setSite({ ...site, name: e.target.value })} /></Field>
        <Field label="Department"><input value={site.department} onChange={e => setSite({ ...site, department: e.target.value })} /></Field>
        <Field label="Delivery address *"><textarea required rows={3} value={site.address} onChange={e => setSite({ ...site, address: e.target.value })} /></Field>
        <Field label="Route/reference"><input value={site.route} onChange={e => setSite({ ...site, route: e.target.value })} /></Field>
        <p><label><input type="checkbox" checked={site.active} onChange={e => setSite({ ...site, active: e.target.checked })} /> Active</label></p>
        <button type="submit">Save Delivery Site</button>
      </form>
    </Dialog>}
  </section>;
}
