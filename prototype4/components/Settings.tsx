"use client";
import { useState } from "react";
import type { Company } from "../lib/types";
import { log } from "../lib/domain";
import { Errors, Field, imageUpload, MasterProps, ReadOnlyNotice } from "./shared";

export default function Settings({ db, role, mutate }: MasterProps) {
  const [company, setCompany] = useState<Company>({ ...db.company });
  const [errors, setErrors] = useState<string[]>([]);
  const admin = role === "Admin";
  return <section><h1 className="!mb-2">Settings</h1><p className="!mt-0 !text-xs">Your laundry details, printing preferences, and activity in one place.</p><ReadOnlyNotice role={role} />
    <p>Current demo role: <strong>{role}</strong>. Role switching demonstrates permissions; it is not production authentication.</p>
    <h2>Company printing details</h2><Errors errors={errors} />
    <form onSubmit={e => { e.preventDefault(); if (!company.name.trim()) return setErrors(["Company name is required."]);
      mutate(state => { if (!admin) throw new Error("Admin access is required."); state.company = { ...company, name: company.name.trim() }; log(state, role, "Company settings saved", company.name); }, "Company printing details saved. Confirmed manifests retain their original details.");
    }}><fieldset disabled={!admin}><legend>Print configuration</legend>
      <Field label="Company name *"><input required value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} /></Field>
      <Field label="Address"><textarea rows={3} value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} /></Field>
      <Field label="Phone"><input type="tel" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} /></Field>
      <Field label="Email"><input type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} /></Field>
      <Field label="Website"><input value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} /></Field>
      <Field label="Default weight unit"><select value={company.defaultWeightUnit} onChange={e => setCompany({ ...company, defaultWeightUnit: e.target.value as "kg" | "lb" })}><option value="kg">kg</option><option value="lb">lb</option></select></Field>
      <Field label="Company logo (PNG/JPEG/WebP, under 300 KB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) imageUpload(file, logo => { setCompany({ ...company, logo }); setErrors([]); }, error => setErrors([error])); }} /></Field>
      {company.logo && <p><img width={100} src={company.logo} alt="Company logo preview" /><button type="button" onClick={() => setCompany({ ...company, logo: "" })}>Remove Logo</button></p>}
      <button type="submit">Save Settings</button>
    </fieldset></form>
    <p>Default bundle sizes are configured per item in Linen Setup → Item Catalogue. Each bundle entry preserves the size used.</p>
    {admin && <><h2>Activity history</h2>{db.activity.length ? <div className="table-scroll"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>{db.activity.map(a => <tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody></table></div> : <p>No activity recorded.</p>}</>}
  </section>;
}
