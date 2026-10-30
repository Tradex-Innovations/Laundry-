"use client";
import { useState } from "react";
import { ChartNoAxesCombined, ChevronDown, Layers3, LayoutDashboard, Leaf, Menu, Plus, Settings2, Truck, UsersRound, X } from "lucide-react";
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
  return <nav aria-label={`${section.label} navigation`} className="mb-7 flex min-h-11 items-center gap-6 overflow-x-auto border-b border-line">
    {section.links.map(([key, label]) => <button key={key} onClick={() => onNavigate(key as Page)} aria-current={page === key || (page === "record" && key === "history") ? "page" : undefined}
      className={`min-h-11 shrink-0 rounded-none border-0 border-b-2 bg-transparent px-0 pb-3 pt-1 text-xs hover:bg-transparent ${page === key || (page === "record" && key === "history") ? "border-brand-500 font-semibold text-brand-600 hover:border-brand-500" : "border-transparent text-muted hover:border-brand-100"}`}>
      {label}{key === "drafts" && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">{draftCount}</span>}
    </button>)}
  </nav>;
}

export default function Navbar({ page, role, onRoleChange, onNavigate, onCreate }: { page: Page; role: Role; onRoleChange: (role: Role) => void; onNavigate: (page: Page) => void; onCreate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-lg">
    <div className="mx-auto flex max-w-[1600px] items-center gap-5 px-5 py-4 lg:px-8 xl:px-10">
      <button className="shrink-0 gap-2.5 border-0 bg-transparent p-0 hover:bg-transparent" onClick={() => onNavigate("dashboard")} aria-label="Pure Linen dashboard">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-white"><Leaf size={21} strokeWidth={1.6} /></span>
        <span className="text-lg font-semibold tracking-tight">purelinen<span className="text-brand-500">.</span></span>
      </button>
      <div className="hidden h-6 border-l border-line xl:block" />
      <nav aria-label="Main navigation" className="hidden flex-1 items-center gap-1 xl:flex">
        {sections.map(s => {
          const active = s.pages.includes(page); const Icon = s.icon;
          return <button key={s.label} aria-current={active ? "true" : undefined} onClick={() => { if (!active) onNavigate(s.links[0][0] as Page); }}
            className={`gap-2 rounded-lg border-0 px-3 py-2.5 text-xs xl:px-4 ${active ? "bg-brand-50 font-semibold text-brand-600" : "bg-transparent text-muted hover:bg-brand-50"}`}><Icon size={16} strokeWidth={1.7} />{s.label}</button>;
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <label className="relative hidden items-center gap-2 sm:flex">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-600">{role === "Admin" ? "AD" : "OP"}</span>
          <select aria-label="Demo role" value={role} onChange={e => onRoleChange(e.target.value as Role)} className="!min-h-8 !w-24 appearance-none !border-0 !bg-transparent !py-1 !pl-0 !pr-5 !text-xs !font-medium !ring-0"><option>Admin</option><option>Operator</option></select><ChevronDown size={12} className="pointer-events-none absolute right-2 text-muted" />
        </label>
        <button className="btn-primary min-h-10 gap-1.5 rounded-lg px-3 text-xs" onClick={onCreate}><Plus size={15} /><span className="hidden sm:inline">Create Dispatch</span><span className="sm:hidden">New</span></button>
        <button aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" className="btn-quiet size-10 p-0 xl:hidden" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="grid grid-cols-2 gap-2 border-t border-line p-4 xl:hidden">
      {sections.map(s => { const Icon = s.icon; return <button key={s.label} className={`justify-start border-0 ${s.pages.includes(page) ? "bg-brand-50 text-brand-600" : "bg-transparent"}`} onClick={() => { if (!s.pages.includes(page)) onNavigate(s.links[0][0] as Page); setMenuOpen(false); }}><Icon size={17} />{s.label}</button>; })}
      <label className="col-span-2 flex items-center gap-3 pt-2 text-xs text-muted">Demo role<select aria-label="Mobile demo role" value={role} onChange={e => onRoleChange(e.target.value as Role)} className="!w-auto"><option>Admin</option><option>Operator</option></select></label>
    </nav>}
  </header>;
}
