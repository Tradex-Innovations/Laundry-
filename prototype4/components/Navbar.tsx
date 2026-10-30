"use client";
import { useEffect, useState } from "react";
import { ChartNoAxesCombined, ChevronDown, ChevronRight, Layers3, LayoutDashboard, Leaf, PanelLeftOpen, Plus, Settings2, Truck, UsersRound, X } from "lucide-react";
import type { Role } from "../lib/types";

export type Page = "dashboard" | "create" | "drafts" | "history" | "customers" | "sites" | "categories" | "items" | "customer-linen" | "pool-linen" | "reports" | "settings" | "record";
const sections = [
  { label: "Dashboard", icon: LayoutDashboard, pages: ["dashboard"] as Page[], links: [["dashboard", "Overview"]] },
  { label: "Linen Out", icon: Truck, pages: ["create", "drafts", "history", "record"] as Page[], links: [["create", "Create Dispatch"], ["drafts", "Draft Dispatches"], ["history", "Dispatch History"]] },
  { label: "Customers", icon: UsersRound, pages: ["customers", "sites"] as Page[], links: [["customers", "Customer List"], ["sites", "Delivery Sites / Departments"]] },
  { label: "Linen Setup", icon: Layers3, pages: ["categories", "items", "customer-linen", "pool-linen"] as Page[], links: [["items", "Item Catalogue"], ["categories", "Categories"], ["customer-linen", "Customer-owned Linen"], ["pool-linen", "Laundry Pool Linen"]] },
  { label: "Reports", icon: ChartNoAxesCombined, pages: ["reports"] as Page[], links: [["reports", "Dispatch Reports"]] },
  { label: "Settings", icon: Settings2, pages: ["settings"] as Page[], links: [["settings", "Company & Permissions"]] },
];

export function SectionNavigation({ page, draftCount, onNavigate }: { page: Page; draftCount: number; onNavigate: (page: Page) => void }) {
  const section = sections.find(s => s.pages.includes(page))!;
  return <nav aria-label={`${section.label} navigation`} className="-mb-px min-w-0 flex-1 flex items-center gap-2 overflow-x-auto">
    {section.links.map(([key, label]) => <button key={key} onClick={() => onNavigate(key as Page)} aria-current={page === key || (page === "record" && key === "history") ? "page" : undefined}
      className={`min-h-12 shrink-0 rounded-none border-0 border-b-2 bg-transparent px-3 pb-3 pt-1 text-sm hover:bg-transparent ${page === key || (page === "record" && key === "history") ? "border-brand-500 font-semibold text-brand-600 hover:border-brand-500" : "border-transparent text-muted hover:border-brand-100"}`}>
      {label}{key === "drafts" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">{draftCount}</span>}
    </button>)}
  </nav>;
}

export default function Navbar({ page, role, onRoleChange, onNavigate, onCreate, draftCount, pageLabel, dirty }: {
  page: Page; role: Role; onRoleChange: (role: Role) => void; onNavigate: (page: Page) => void; onCreate: () => void;
  draftCount: number; pageLabel: string; dirty: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (next: Page) => { onNavigate(next); setMenuOpen(false); };
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [menuOpen]);
  return <>
    <header className="sticky top-0 z-40">
      <div className="border-b border-line bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-6 lg:px-8 xl:px-10">
          <button aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="app-drawer" className="btn-quiet size-12 p-0" onClick={() => setMenuOpen(true)}><PanelLeftOpen size={22} /></button>
          <button className="shrink-0 gap-2.5 border-0 bg-transparent p-0 hover:bg-transparent" onClick={() => go("dashboard")} aria-label="Pure Linen dashboard">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500 text-white"><Leaf size={22} strokeWidth={1.6} /></span>
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">purelinen<span className="text-brand-500">.</span></span>
          </button>
          <span className="ml-auto truncate text-sm font-medium text-muted">{pageLabel}</span>
        </div>
      </div>
      <div className="border-b border-line bg-canvas/95 backdrop-blur-lg">
        <div className="mx-auto max-w-[1600px] px-4 pt-3 md:px-6 lg:px-8 xl:px-10">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
            <Leaf size={12} /><span>Workspace</span><ChevronRight size={12} /><span className="text-ink">{pageLabel}</span>
            {dirty && <span className="ml-auto rounded bg-brand-50 px-2 py-1 text-[10px] text-brand-600">Unsaved changes</span>}
          </div>
          <div className="flex items-end justify-between gap-3">
            <SectionNavigation page={page} draftCount={draftCount} onNavigate={onNavigate} />
            <button className="btn-primary mb-1.5 min-h-10 shrink-0 gap-1.5 rounded-xl px-3 text-sm" onClick={onCreate}><Plus size={16} />Create Dispatch</button>
          </div>
        </div>
      </div>
    </header>
    {menuOpen && <>
      <div className="app-drawer-backdrop" onClick={() => setMenuOpen(false)} />
      <aside id="app-drawer" className="app-drawer" aria-label="Main navigation">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-white"><Leaf size={20} strokeWidth={1.6} /></span>purelinen<span className="text-brand-500">.</span></span>
          <button className="btn-quiet size-11 p-0" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {sections.map(s => {
            const active = s.pages.includes(page); const Icon = s.icon;
            return <button key={s.label} aria-current={active ? "true" : undefined} onClick={() => { if (!active) go(s.links[0][0] as Page); else setMenuOpen(false); }}
              className={`min-h-14 justify-start gap-3 border-0 px-3 text-left text-sm ${active ? "bg-brand-50 font-semibold text-brand-600" : "bg-transparent text-ink hover:bg-brand-50"}`}>
              <Icon size={20} strokeWidth={1.7} />{s.label}
            </button>;
          })}
        </nav>
        <label className="relative mx-4 mb-4 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">{role === "Admin" ? "AD" : "OP"}</span>
          <select aria-label="Demo role" value={role} onChange={e => onRoleChange(e.target.value as Role)} className="!min-h-10 !border-0 !bg-transparent !py-1 !pl-0 !pr-5 !text-sm !font-medium !ring-0"><option>Admin</option><option>Operator</option></select>
          <ChevronDown size={12} className="pointer-events-none absolute right-3 text-muted" />
        </label>
      </aside>
    </>}
  </>;
}
