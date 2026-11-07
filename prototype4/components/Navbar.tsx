"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Building2, ChartNoAxesCombined, ChevronRight, ClipboardList, LayoutGrid, Leaf, Menu, Monitor, Settings2, Shield, Truck, UsersRound, X } from "lucide-react";
import type { Role } from "../lib/types";
import ThemeToggle from "./ThemeToggle";
import { DeliveryTruckIcon, DispatchHistoryIcon, LinenInIcon, LinenOutIcon, LinenStackIcon, ManifestIcon, PackedCartIcon, ReceivingRecordsIcon, type LinenIconProps } from "./LinenIcons";

function outlineIcon(Icon: ComponentType<LinenIconProps>) {
  return function OutlineIcon(props: LinenIconProps) { return <Icon {...props} duotone={false} />; };
}
const LinenInOutline = outlineIcon(LinenInIcon);
const LinenOutOutline = outlineIcon(LinenOutIcon);
const PackedCartOutline = outlineIcon(PackedCartIcon);
const DeliveryOutline = outlineIcon(DeliveryTruckIcon);
const ManifestOutline = outlineIcon(ManifestIcon);
const HistoryOutline = outlineIcon(DispatchHistoryIcon);
const LinenStackOutline = outlineIcon(LinenStackIcon);
const RecordsOutline = outlineIcon(ReceivingRecordsIcon);

export type Page = "admin-dashboard" | "dashboard" | "receipts" | "receiving" | "create" | "drafts" | "deliveries" | "drivers" | "history" | "manifests" | "customers" | "sites" | "categories" | "items" | "customer-linen" | "pool-linen" | "reports" | "settings" | "record" | "platform-home" | "platform-laundries" | "platform-laundry" | "platform-users" | "platform-audit";
export const isAdminPage = (page: Page) => ["admin-dashboard", "customers", "sites", "categories", "items", "customer-linen", "pool-linen", "reports", "settings", "drivers"].includes(page);
export const isPlatformPage = (page: Page) => page.startsWith("platform-");
const operations = [
  { page: "dashboard" as Page, label: "Overview", icon: LayoutGrid },
  { page: "receiving" as Page, label: "Linen In", icon: LinenInOutline },
  { page: "create" as Page, label: "Linen Out", icon: LinenOutOutline },
  { page: "drafts" as Page, label: "Packed carts", icon: PackedCartOutline },
  { page: "deliveries" as Page, label: "Assign Deliveries", icon: DeliveryOutline },
  { page: "manifests" as Page, label: "Manifests", icon: ManifestOutline },
  { page: "history" as Page, label: "History", icon: HistoryOutline },
];
const administration = [
  { page: "admin-dashboard" as Page, label: "Overview", icon: LayoutGrid },
  { page: "customers" as Page, label: "Customers", icon: UsersRound },
  { page: "sites" as Page, label: "Delivery sites", icon: Truck },
  { page: "items" as Page, label: "Item catalogue", icon: LinenStackOutline },
  { page: "categories" as Page, label: "Categories", icon: LayoutGrid },
  { page: "customer-linen" as Page, label: "Customer-owned linen", icon: RecordsOutline },
  { page: "pool-linen" as Page, label: "Laundry pool linen", icon: LinenStackOutline },
  { page: "drivers" as Page, label: "Drivers", icon: Truck },
  { page: "reports" as Page, label: "Reports", icon: ChartNoAxesCombined },
  { page: "settings" as Page, label: "Settings", icon: Settings2 },
];
const platform = [
  { page: "platform-home" as Page, label: "Overview", icon: LayoutGrid },
  { page: "platform-laundries" as Page, label: "Laundries", icon: Building2 },
  { page: "platform-users" as Page, label: "Users", icon: UsersRound },
  { page: "platform-audit" as Page, label: "Audit log", icon: ClipboardList },
];

export default function Navbar({ page, role, onRoleChange, onNavigate, draftCount, pageLabel, dirty }: {
  page: Page; role: Role; onRoleChange: (role: Role) => void; onNavigate: (page: Page) => void;
  draftCount: number; pageLabel: string; dirty: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const admin = isAdminPage(page);
  const platformView = isPlatformPage(page);
  const go = (next: Page) => { onNavigate(next); setMenuOpen(false); };
  useEffect(() => {
    if (!menuOpen) return;
    drawer.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; menuButton.current?.focus({ preventScroll: true }); };
  }, [menuOpen]);
  const links = (expanded = false) => <>
    {(platformView ? <div className="rail-heading">PLATFORM</div> : admin ? <div className="rail-heading">ADMINISTRATION</div> : null)}
    {(platformView ? platform : admin ? administration : operations).map(link => <button key={link.page} title={link.label} onClick={() => go(link.page)} className={`rail-link ${expanded ? "expanded" : ""}`} aria-current={page === link.page || (page === "receipts" && link.page === "receiving") || (page === "record" && link.page === "history") || (page === "platform-laundry" && link.page === "platform-laundries") ? "page" : undefined}>
      <link.icon size={22} strokeWidth={1.8} aria-hidden="true" /><span>{link.label}</span>{link.page === "drafts" && draftCount > 0 && <span className="rail-count">{draftCount}</span>}
    </button>)}
    <div className="rail-bottom">{platformView && <div className="platform-sidebar-note"><Shield size={18} /><strong>Platform administration</strong><span>Manage every laundry from one place.</span></div>}{!platformView && <button title={admin ? "Operations" : "Administration"} className={`rail-link ${expanded ? "expanded" : ""}`} onClick={() => go(admin ? "dashboard" : "admin-dashboard")}>
      {admin ? <LayoutGrid size={21} /> : <Settings2 size={21} />}<span>{admin ? "Operations" : "Admin"}</span>
    </button>}<span className="rail-version">PROTOTYPE v1.0</span></div>
  </>;
  return <>
    <header className="workspace-header">
      <button ref={menuButton} className="mobile-menu btn-quiet" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="workspace-drawer" onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
      <button className="brand-lockup" onClick={() => go(platformView || role === "SystemsAdministrator" ? "platform-home" : admin || role === "Admin" ? "admin-dashboard" : "dashboard")} aria-label="Pure Linen home"><span className="brand-mark"><Leaf size={25} strokeWidth={1.7} /></span><span>purelinen<span className="brand-dot">.</span><small>{platformView ? "PLATFORM CONTROL" : "LAUNDRY MANAGEMENT"}</small></span></button>
      {platformView && <span className="platform-header-label"><Shield size={16} />Administration console</span>}
      {!admin && !platformView && <span className="operator-page-title">{page === "dashboard" ? "Operations" : pageLabel}</span>}
      {!admin && !platformView && dirty && <span className="operator-unsaved">Unsaved changes</span>}
      {!platformView && <div className="workspace-switch" aria-label="Workspace"><button aria-pressed={!admin} onClick={() => go("dashboard")}><LayoutGrid size={16} />Operations</button><button aria-pressed={admin} onClick={() => go("admin-dashboard")}><Settings2 size={16} />Administration</button></div>}
      <div className="header-right"><span className="demo-indicator"><span />Demo workspace</span><span className="header-divider" /><ThemeToggle /><label className="role-control"><span className="avatar">{role === "SystemsAdministrator" ? "SA" : role === "Admin" ? "AD" : "OP"}</span><span className="sr-only">Demo role</span><select aria-label="Demo role" value={role} onChange={e => onRoleChange(e.target.value as Role)}><option value="SystemsAdministrator">Systems Administrator</option><option value="Admin">Laundry Admin</option><option value="Operator">Operator</option></select></label></div>
    </header>
    <aside className={`workspace-rail ${admin || platformView ? "admin-rail" : ""}`}><nav aria-label="Main navigation">{links(admin || platformView)}</nav></aside>
    {menuOpen && <dialog id="workspace-drawer" ref={drawer} className="mobile-drawer" aria-label="Main navigation" onCancel={() => setMenuOpen(false)}><div className="drawer-heading"><span className="brand-mark"><Leaf size={22} strokeWidth={1.7} /></span><strong>Workspace</strong><button aria-label="Close navigation" className="btn-quiet" onClick={() => setMenuOpen(false)}><X size={21} /></button></div><nav>{links(true)}</nav></dialog>}
    {(admin || platformView) && <div className="workspace-breadcrumb"><span>{platformView ? <Shield size={14} /> : admin ? <Settings2 size={14} /> : <Monitor size={14} />}{platformView ? "Systems Administrator" : admin ? "Administration" : "Operations"}</span><ChevronRight size={13} /><strong>{pageLabel}</strong>{dirty ? <span className="unsaved-pill">Unsaved changes</span> : <span className="workspace-kind">{platformView ? "Platform workspace" : admin ? "Management workspace" : "Touch workspace"}</span>}</div>}
  </>;
}
