"use client";
import { useState } from "react";
import { Pencil, Plus, Search, Truck } from "lucide-react";
import type { Driver } from "../lib/types";
import { uid } from "../lib/domain";
import { saveDriver } from "../lib/deliveries";
import { ActiveBadge, Dialog, Field, ReadOnlyNotice, type MasterProps } from "./shared";

export default function Drivers({ db, role, mutate }: MasterProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Driver | null>(null);
  const rows = (db.drivers || []).filter(d => `${d.name} ${d.phone} ${d.vehicle}`.toLowerCase().includes(query.toLowerCase()));
  const editable = role === "Admin";
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="!mb-2">Drivers</h1><p className="!mt-0">Manage the drivers available for delivery assignment.</p></div>{editable && <button className="btn-primary" onClick={() => setEditing({ id: uid(), name: "", phone: "", vehicle: "", active: true })}><Plus size={16} />Add driver</button>}</div><ReadOnlyNotice role={role} /><label className="relative my-5 block max-w-md"><Search size={16} className="absolute left-3 top-3 text-muted" /><input className="!pl-9" type="search" aria-label="Search drivers" placeholder="Name, phone or vehicle" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {rows.length ? <div className="table-scroll"><table><thead><tr><th>Driver</th><th>Phone</th><th>Vehicle</th><th>Status</th>{editable && <th>Actions</th>}</tr></thead><tbody>{rows.map(d => <tr key={d.id}><td>{d.name}</td><td>{d.phone || "—"}</td><td>{d.vehicle || "—"}</td><td><ActiveBadge active={d.active} /></td>{editable && <td><button aria-label={`Edit driver ${d.name}`} onClick={() => setEditing({ ...d })}><Pencil size={15} />Edit</button></td>}</tr>)}</tbody></table></div> : <div className="delivery-empty"><Truck size={34} /><p>{query ? "No matching drivers." : "No drivers yet. Add a driver to start assigning deliveries."}</p></div>}
    {editing && editable && <Dialog title={db.drivers?.some(d => d.id === editing.id) ? "Edit Driver" : "Add Driver"} onClose={() => setEditing(null)}><form onSubmit={e => { e.preventDefault(); if (mutate(state => { saveDriver(state, editing, role); }, "Driver saved.")) setEditing(null); }}><Field label="Driver name *"><input required minLength={2} autoFocus value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field><Field label="Phone"><input type="tel" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></Field><Field label="Vehicle"><input placeholder="Van name or registration" value={editing.vehicle} onChange={e => setEditing({ ...editing, vehicle: e.target.value })} /></Field><label className="flex items-center gap-3"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />Available for new assignments</label><p className="!text-xs">Inactive drivers remain on existing assignment records.</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit">Save driver</button></div></form></Dialog>}
  </section>;
}
