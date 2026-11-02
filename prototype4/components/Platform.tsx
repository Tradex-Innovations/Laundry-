"use client";
import { useState } from "react";
import { Building2, Plus, Shield, UsersRound } from "lucide-react";
import type { Database, Laundry, LaundryPlan, LaundryStatus, PlatformUser, Role } from "../lib/types";
import { uid } from "../lib/domain";
import { laundryName, laundryPlans, laundryStats, laundryStatuses, LIVE_LAUNDRY_ID, saveLaundry, saveUser, setLaundryStatus, setUserActive } from "../lib/platform";
import type { Page } from "./Navbar";
import type { Mutate } from "./shared";
import { Dialog, Errors, Field } from "./shared";

const blankLaundry = (): Laundry => ({ id: uid(), code: "", name: "", city: "", contact: "", email: "", phone: "", status: "trial", plan: "trial", createdAt: "", snapshot: { customers: 0, sites: 0, items: 0, dispatches: 0, receipts: 0 } });
const blankUser = (): PlatformUser => ({ id: uid(), name: "", email: "", phone: "", laundryId: LIVE_LAUNDRY_ID, role: "Operator", active: true, lastSignIn: null });
const statusClass = (status: string) => status === "active" ? "bg-brand-50 text-brand-600" : status === "trial" ? "bg-weight-50 text-weight-700" : "bg-red-50 text-red-600";

export default function Platform({ db, page, laundryId, mutate, onNavigate, onOpenLaundry }: {
  db: Database; page: Page; laundryId: string; mutate: Mutate; onNavigate: (page: Page) => void; onOpenLaundry: (id: string) => void;
}) {
  const [laundry, setLaundry] = useState<Laundry | null>(null);
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const laundries = db.laundries || [];
  const users = db.users || [];
  const platformLog = db.activity.filter(a => a.scope === "platform");
  const selected = laundries.find(l => l.id === laundryId);
  if (page === "platform-home") {
    const active = laundries.filter(l => l.status !== "suspended").length;
    return <section>
      <div className="eyebrow">PLATFORM CONTROL</div>
      <h1 className="!mb-2">Systems Administrator</h1>
      <p className="!mt-0">Issue Pure Linen to laundries, then manage the people who work there.</p>
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Platform totals">
        {[{ label: "Laundries", value: laundries.length, icon: Building2 }, { label: "Active sites", value: active, icon: Building2 }, { label: "Users", value: users.length, icon: UsersRound }, { label: "Active users", value: users.filter(u => u.active).length, icon: Shield }].map(card =>
          <div className="rounded-2xl border border-line bg-white p-5" key={card.label}><div className="mb-3 flex items-center justify-between text-sm text-muted">{card.label}<card.icon size={18} className="text-brand-500" /></div><div className="text-[32px] font-semibold tracking-tight">{card.value}</div></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[{ title: "Laundries", copy: "Create, pause or review a business.", page: "platform-laundries" as Page }, { title: "Users", copy: "Add staff and Systems Administrators.", page: "platform-users" as Page }, { title: "Audit log", copy: "See who changed a laundry or a user.", page: "platform-audit" as Page }].map(card =>
          <button key={card.title} className="min-h-32 flex-col items-start justify-between p-5 text-left" onClick={() => onNavigate(card.page)}><strong>{card.title}</strong><span className="text-sm font-normal text-muted">{card.copy}</span></button>)}
      </div>
      <h2>Recent platform actions</h2>
      {platformLog.length ? <ul>{platformLog.slice(0, 6).map(a => <li key={a.id}>{new Date(a.at).toLocaleString()} · {a.action} · {a.detail}</li>)}</ul> : <p>No platform actions yet.</p>}
    </section>;
  }
  if (page === "platform-audit") return <section>
    <h1 className="!mb-2">Audit log</h1>
    <p className="!mt-0">Systems Administrator actions only. Laundry floor work stays in each laundry.</p>
    {platformLog.length ? <div className="table-scroll"><table><thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>{platformLog.map(a => <tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody></table></div> : <p>No platform actions yet.</p>}
  </section>;
  if (page === "platform-laundry" && selected) {
    const stats = laundryStats(db, selected);
    const staff = users.filter(u => u.laundryId === selected.id);
    return <section>
      <button className="btn-quiet !px-0" onClick={() => onNavigate("platform-laundries")}>Back to laundries</button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">{selected.name}</h1><p className="!mt-0">{selected.code} · {selected.city} · {selected.contact}</p></div><span className={`status-badge ${statusClass(selected.status)}`}>{selected.status}</span></div>
      <dl className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(stats).map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-canvas p-4"><dt className="text-[11px] capitalize text-muted">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>)}
      </dl>
      <p className="!text-xs">{selected.id === LIVE_LAUNDRY_ID ? "Counts come from this demo laundry’s live records." : "This laundry is a platform record. Floor data is not mixed with Pure Linen’s carts."}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {laundryStatuses.filter(s => s !== selected.status).map(status => <button key={status} onClick={() => mutate(state => setLaundryStatus(state, selected.id, status, "SystemsAdministrator"), `${selected.name} is now ${status}.`)}>{status === "suspended" ? "Suspend" : status === "active" ? "Activate" : "Set trial"}</button>)}
        <button onClick={() => { setErrors([]); setLaundry({ ...selected }); }}>Edit laundry</button>
      </div>
      <h2>People at this laundry</h2>
      {staff.length ? <div className="table-scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>{staff.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.role}</td><td>{u.email}</td><td><span className={`status-badge ${u.active ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted"}`}>{u.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div> : <p>No users assigned yet.</p>}
      {forms()}
    </section>;
  }
  if (page === "platform-users") {
    const rows = users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || (statusFilter === "active" ? u.active : !u.active)) && (!roleFilter || u.role === roleFilter));
    return <section>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">Users</h1><p className="!mt-0">Everyone who can sign in, across every laundry.</p></div><button className="btn-primary" onClick={() => { setErrors([]); setUser(blankUser()); }}><Plus size={15} />Add user</button></div>
      <div className="page-toolbar">
        <Field label="Search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or email" /></Field>
        <Field label="Role"><select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="">All roles</option><option value="SystemsAdministrator">Systems Administrator</option><option>Admin</option><option>Operator</option></select></Field>
        <Field label="Status"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
      </div>
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Laundry</th><th>Role</th><th>Last sign-in</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{laundryName(db, u.laundryId)}</td><td>{u.role === "SystemsAdministrator" ? "Systems Admin" : u.role}</td><td>{u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "—"}</td><td><span className={`status-badge ${u.active ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted"}`}>{u.active ? "Active" : "Inactive"}</span></td>
          <td><div className="flex gap-1"><button onClick={() => { setErrors([]); setUser({ ...u }); }}>Edit</button><button onClick={() => mutate(state => setUserActive(state, u.id, !u.active, "SystemsAdministrator"), u.active ? `${u.name} deactivated.` : `${u.name} reactivated.`)}>{u.active ? "Deactivate" : "Reactivate"}</button></div></td></tr>)}</tbody></table></div>
      {forms()}
    </section>;
  }
  const rows = laundries.filter(l => `${l.name} ${l.code} ${l.city}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || l.status === statusFilter));
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">Laundries</h1><p className="!mt-0">Each business is a separate workspace. Floor data is never mixed.</p></div><button className="btn-primary" onClick={() => { setErrors([]); setLaundry(blankLaundry()); }}><Plus size={15} />Add laundry</button></div>
    <div className="page-toolbar">
      <Field label="Search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, code or city" /></Field>
      <Field label="Status"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All</option>{laundryStatuses.map(s => <option key={s}>{s}</option>)}</select></Field>
    </div>
    <div className="table-scroll"><table><thead><tr><th>Code</th><th>Laundry</th><th>City</th><th>Plan</th><th>Status</th><th>Users</th><th></th></tr></thead>
      <tbody>{rows.map(l => <tr key={l.id}><td>{l.code}</td><td>{l.name}</td><td>{l.city}</td><td>{l.plan}</td><td><span className={`status-badge ${statusClass(l.status)}`}>{l.status}</span></td><td>{users.filter(u => u.laundryId === l.id).length}</td>
        <td><button onClick={() => onOpenLaundry(l.id)}>Open</button></td></tr>)}</tbody></table></div>
    {forms()}
  </section>;

  function forms() {
    return <>
      {laundry && <Dialog title={laundries.some(l => l.id === laundry.id && l.name) ? "Edit laundry" : "New laundry"} onClose={() => setLaundry(null)}>
        <Errors errors={errors} />
        <form onSubmit={e => { e.preventDefault(); if (mutate(state => saveLaundry(state, laundry, "SystemsAdministrator"), `${laundry.name} saved.`)) setLaundry(null); }}>
          <Field label="Laundry name *"><input required value={laundry.name} onChange={e => setLaundry({ ...laundry, name: e.target.value })} /></Field>
          <Field label="Code *"><input required value={laundry.code} onChange={e => setLaundry({ ...laundry, code: e.target.value })} /></Field>
          <Field label="City"><input value={laundry.city} onChange={e => setLaundry({ ...laundry, city: e.target.value })} /></Field>
          <Field label="Contact"><input value={laundry.contact} onChange={e => setLaundry({ ...laundry, contact: e.target.value })} /></Field>
          <Field label="Email"><input type="email" value={laundry.email} onChange={e => setLaundry({ ...laundry, email: e.target.value })} /></Field>
          <Field label="Phone"><input value={laundry.phone} onChange={e => setLaundry({ ...laundry, phone: e.target.value })} /></Field>
          <Field label="Plan"><select value={laundry.plan} onChange={e => setLaundry({ ...laundry, plan: e.target.value as LaundryPlan })}>{laundryPlans.map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Status"><select value={laundry.status} onChange={e => setLaundry({ ...laundry, status: e.target.value as LaundryStatus })}>{laundryStatuses.map(s => <option key={s}>{s}</option>)}</select></Field>
          <button type="submit">Save laundry</button>
        </form>
      </Dialog>}
      {user && <Dialog title={users.some(u => u.id === user.id && u.email) ? "Edit user" : "New user"} onClose={() => setUser(null)}>
        <Errors errors={errors} />
        <form onSubmit={e => { e.preventDefault(); if (mutate(state => saveUser(state, user, "SystemsAdministrator"), `${user.name} saved.`)) setUser(null); }}>
          <Field label="Name *"><input required value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></Field>
          <Field label="Email *"><input required type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} /></Field>
          <Field label="Phone"><input value={user.phone} onChange={e => setUser({ ...user, phone: e.target.value })} /></Field>
          <Field label="Role *"><select value={user.role} onChange={e => setUser({ ...user, role: e.target.value as Role, laundryId: e.target.value === "SystemsAdministrator" ? null : user.laundryId || LIVE_LAUNDRY_ID })}>
            <option value="Operator">Operator</option><option value="Admin">Laundry Admin</option><option value="SystemsAdministrator">Systems Administrator</option>
          </select></Field>
          {user.role !== "SystemsAdministrator" && <Field label="Laundry *"><select value={user.laundryId || ""} onChange={e => setUser({ ...user, laundryId: e.target.value })}>{laundries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={user.active} onChange={e => setUser({ ...user, active: e.target.checked })} /> Active</label>
          <button type="submit">Save user</button>
        </form>
      </Dialog>}
    </>;
  }
}
