"use client";
import { ArrowDownToLine, ClipboardList, FileText, History, Layers3, Truck } from "lucide-react";
import type { Page } from "./Navbar";

export default function Dashboard({ onCreate, onNavigate }: { onCreate: () => void; onNavigate: (page: Page) => void }) {
  const tiles = [
    { label: "Linen In (Soil)", icon: ArrowDownToLine, color: "#8575b9", action: () => onNavigate("receiving") },
    { label: "Linen Out (Clean)", icon: Layers3, color: "#26a8df", action: onCreate },
    { label: "Dispatches", icon: Truck, color: "#e99a50", action: () => onNavigate("drafts") },
    { label: "Shipping Manifest", icon: FileText, color: "#7e8c96", action: () => onNavigate("manifests") },
    { label: "Receiving Records", icon: ClipboardList, color: "#17b4b7", action: () => onNavigate("receipts") },
    { label: "Dispatch History", icon: History, color: "#6289c5", action: () => onNavigate("history") },
  ];
  return <section className="dashboard operator-dashboard" aria-label="Shipping and receiving operations">
    <div className="operator-tile-grid">{tiles.map(tile => <button key={tile.label} className="operator-tile" onClick={tile.action}>
      <tile.icon size={48} strokeWidth={1.4} color={tile.color} aria-hidden="true" />
      <span>{tile.label}</span>
    </button>)}</div>
  </section>;
}
