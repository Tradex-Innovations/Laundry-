"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Leaf, X } from "lucide-react";
import type { Database, Dispatch, Role } from "../lib/types";
import { cancelDispatch, clone, newDispatch, saveDispatch } from "../lib/domain";
import { localRepository, STORAGE_KEY } from "../lib/repository";
import Customers from "./Customers";
import LinenSetup from "./LinenSetup";
import DispatchEditor from "./DispatchEditor";
import History, { RecordView } from "./History";
import Manifest from "./Manifest";
import Reports from "./Reports";
import Settings from "./Settings";
import type { Mutate } from "./shared";
import Navbar, { Page } from "./Navbar";
import Dashboard from "./Dashboard";

const pageLabels: Record<Page, string> = { dashboard: "Dashboard", create: "Create Dispatch", drafts: "Draft Dispatches", history: "Dispatch History", customers: "Customers", sites: "Delivery Sites", categories: "Categories", items: "Item Catalogue", "customer-linen": "Customer-owned Linen", "pool-linen": "Laundry Pool Linen", reports: "Reports", settings: "Settings", record: "Dispatch Details" };

export default function LaundryApp() {
  const [db, setDb] = useState<Database | null>(null);
  const [role, setRole] = useState<Role>("Admin");
  const [page, setPage] = useState<Page>("dashboard");
  const [draft, setDraft] = useState<Dispatch | null>(null);
  const [dirty, setDirty] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [preview, setPreview] = useState<Dispatch | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    try { setDb(localRepository.load()); const storedRole = localStorage.getItem("laundry.prototype4.role"); if (storedRole === "Operator" || storedRole === "Admin") setRole(storedRole); }
    catch (e) { setError(`Cannot load demo data: ${e instanceof Error ? e.message : String(e)}. Please enable browser storage and reload.`); }
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) try { setDb(localRepository.load()); setNotice("Demo data updated in another tab. Reopen a saved draft before editing it here."); } catch (e) { setError(String(e)); }
    };
    window.addEventListener("storage", storage); return () => window.removeEventListener("storage", storage);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, [page]);
  const mutate: Mutate = (operation, message) => {
    try { const result = localRepository.update(operation); setDb(result.db); setError(""); setNotice(message); return true; }
    catch (e) { const message = e instanceof Error ? e.message : String(e); setError(message); window.alert(message); return false; }
  };
  if (!db) return <main className="mx-auto max-w-xl px-6 py-24"><Leaf className="mb-5 text-brand-500" size={32} /><h1 className="mb-4 text-2xl font-semibold">Pure Linen</h1>{error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p> : <p className="text-muted">Getting your workspace ready…</p>}</main>;
  const database = db;
  function canLeave() { return !dirty || window.confirm("This draft has unsaved changes. Leave without saving those changes?"); }
  function navigate(next: Page) {
    if (next === page) return;
    if (!canLeave()) return;
    setDirty(false); setError(""); setNotice("");
    if (next === "create") setDraft(newDispatch(database, `Demo ${role}`));
    setPage(next);
  }
  function createDispatch() {
    if (!canLeave()) return;
    setDirty(false); setError(""); setNotice(""); setDraft(newDispatch(database, `Demo ${role}`)); setPage("create");
    window.scrollTo({ top: 0 });
  }
  function openRecord(record: Dispatch, checkDirty = true) {
    if (checkDirty && !canLeave()) return;
    setDirty(false); setError("");
    if (record.status === "Draft") { setDraft(clone(record)); setPage("create"); }
    else { setRecordId(record.id); setPage("record"); }
  }
  function persist(d: Dispatch, confirm: boolean) {
    let result: Dispatch | undefined;
    const ok = mutate(state => { result = saveDispatch(state, d, role, confirm); }, confirm ? "Dispatch confirmed. Linen Out is recorded and the document is locked." : "Draft saved. You can reopen it from Draft Dispatches.");
    if (ok && result) { setDraft(result); setDirty(false); return result; }
    return undefined;
  }
  const openPreview = (record: Dispatch) => setPreview(clone(record));
  const record = db.dispatches.find(d => d.id === recordId);
  return <>
    <div hidden={!!preview}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <Navbar page={page} role={role} draftCount={db.dispatches.filter(d => d.status === "Draft").length} pageLabel={pageLabels[page]} dirty={dirty} onRoleChange={next => { try { localStorage.setItem("laundry.prototype4.role", next); setRole(next); setNotice(`Switched to ${next}. Demo permissions only.`); } catch { setError("The role preference could not be saved to browser storage."); } }} onNavigate={navigate} onCreate={createDispatch} />
      <div className="app-shell">
      {notice && <div role="status" className="mb-5 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-700"><CheckCircle2 size={17} className="shrink-0" /><span className="flex-1">{notice}</span><button className="btn-quiet !size-7 !min-h-7 !p-0" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={14} /></button></div>}
      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><CircleAlert size={17} className="shrink-0" /><p className="flex-1 whitespace-pre-line">{error}</p><button className="btn-quiet !size-7 !min-h-7 !p-0" aria-label="Dismiss error" onClick={() => setError("")}><X size={14} /></button></div>}
      <main ref={mainRef} id="main-content" tabIndex={-1} className="app-content">
        {page === "dashboard" && <Dashboard db={db} onCreate={createDispatch} onOpen={openRecord} onPreview={openPreview} onNavigate={navigate} />}
        {page === "create" && draft && <DispatchEditor key={draft.id} db={db} draft={draft} onChange={d => { setDraft(d); setDirty(true); }} onSave={persist} onOpen={d => openRecord(d, false)} onPreview={openPreview} />}
        {(page === "drafts" || page === "history") && <History key={page} db={db} draftsOnly={page === "drafts"} onOpen={openRecord} onPreview={openPreview} />}
        {(page === "customers" || page === "sites") && <Customers key={page} db={db} role={role} mutate={mutate} sitesOnly={page === "sites"} />}
        {(["categories", "items", "customer-linen", "pool-linen"] as Page[]).includes(page) && <LinenSetup key={page} db={db} role={role} mutate={mutate} view={page as "categories" | "items" | "customer-linen" | "pool-linen"} />}
        {page === "reports" && <Reports db={db} />}
        {page === "settings" && <Settings db={db} role={role} mutate={mutate} />}
        {page === "record" && (record ? <RecordView key={record.id} db={db} record={record} role={role} onPreview={openPreview} onCancel={(id, reason) => mutate(state => cancelDispatch(state, id, reason, role), "Dispatch cancelled. Operational dashboard and report totals have been updated.")} /> : <p>Dispatch not found. Open a record from Dispatch History.</p>)}
      </main>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[10px] text-muted"><span>Pure Linen · Laundry Management</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-brand-500" />Saved on this device · Demo workspace</span></footer>
      </div>
    </div>
    {preview && <Manifest db={db} record={preview} onClose={() => setPreview(null)} />}
  </>;
}
