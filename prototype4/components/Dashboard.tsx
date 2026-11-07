"use client";
import { ArrowUpRight } from "lucide-react";
import { DeliveryTruckIcon, DispatchHistoryIcon, LinenInIcon, LinenOutIcon, ManifestIcon, ReceivingRecordsIcon } from "./LinenIcons";
import type { Page } from "./Navbar";

export default function Dashboard({ onCreate, onNavigate }: { onCreate: () => void; onNavigate: (page: Page) => void }) {
  const tiles = [
    { label: "Linen In", description: "Receive soiled linen and record your carts.", icon: LinenInIcon, tone: "violet", action: () => onNavigate("receiving") },
    { label: "Linen Out", description: "Pack clean linen for your customers.", icon: LinenOutIcon, tone: "teal", action: onCreate },
    { label: "Assign Deliveries", description: "Plan routes and assign your drivers.", icon: DeliveryTruckIcon, tone: "amber", action: () => onNavigate("deliveries") },
    { label: "Shipping Manifest", description: "Prepare and print delivery documents.", icon: ManifestIcon, tone: "slate", action: () => onNavigate("manifests") },
    { label: "Receiving Records", description: "Find and review incoming linen.", icon: ReceivingRecordsIcon, tone: "teal", action: () => onNavigate("receipts") },
    { label: "Dispatch History", description: "Look back at previous dispatches.", icon: DispatchHistoryIcon, tone: "blue", action: () => onNavigate("history") },
  ];
  return <section className="dashboard operator-dashboard operator-launcher" aria-labelledby="operator-launcher-title">
    <div className="launcher-heading"><span className="launcher-eyebrow">YOUR WORKSPACE</span><h1 id="operator-launcher-title">Shipping &amp; receiving</h1><p>Everything you need to keep linen moving.</p></div>
    <div className="launcher-grid">{tiles.map(tile => <button type="button" key={tile.label} className={`launcher-tile launcher-tone-${tile.tone}`} onClick={tile.action}>
      <span className="launcher-tile-top"><span className="launcher-icon"><tile.icon size={34} strokeWidth={1.7} aria-hidden="true" /></span><ArrowUpRight className="launcher-arrow" size={20} strokeWidth={1.6} aria-hidden="true" /></span>
      <span className="launcher-copy"><strong>{tile.label}</strong><span>{tile.description}</span></span>
    </button>)}</div>
  </section>;
}
