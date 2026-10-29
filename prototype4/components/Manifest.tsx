"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import type { Database, Dispatch } from "../lib/types";
import { fmt, ownerLabel, totals } from "../lib/domain";

function Barcode({ number }: { number: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) JsBarcode(ref.current, number, { format: "CODE128", width: 1.5, height: 38, fontSize: 12, margin: 8 }); }, [number]);
  return <svg ref={ref} role="img" aria-label={`Barcode ${number}`} />;
}
export default function Manifest({ db, record, onClose }: { db: Database; record: Dispatch; onClose: () => void }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = document.createElement("div"); node.className = "manifest-print-root"; document.body.append(node); setContainer(node);
    return () => node.remove();
  }, []);
  if (!container) return null;
  return createPortal(<>
    <div className="no-print mb-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button className="btn-quiet !px-0" onClick={onClose}><ArrowLeft size={16} />Close Print Preview</button><button className="btn-primary" onClick={() => window.print()}><Printer size={16} />Print / Save as PDF</button></div><p className="rounded-xl border border-[#e0e6d8] bg-[#edf3e8] px-4 py-3 text-xs leading-relaxed text-[#7e9173]">A4 portrait · Select a printer or Save as PDF in the browser dialog. Printing and reprinting leave the dispatch unchanged.</p></div>
    <ManifestDocument db={db} record={record} />
  </>, container);
}

export function ManifestDocument({ db, record }: { db: Database; record: Dispatch }) {
  const snapshot = record.snapshot;
  const customer = snapshot?.customer || db.customers.find(c => c.id === record.customerId);
  const site = snapshot?.site || db.sites.find(s => s.id === record.siteId);
  const company = snapshot?.company || db.company;
  const number = record.number || "DRAFT-PREVIEW";
  const t = totals([record]);
  return <article className="manifest" aria-label="Shipping Manifest">
      <header>
        {company.logo ? <img src={company.logo} alt={`${company.name} logo`} width={100} /> : <p>[Company Logo]</p>}
        <h2>{company.name}</h2><p>{company.address}<br />Phone: {company.phone} · Email: {company.email}<br />{company.website}</p>
        <h1>Shipping Manifest</h1>
        <p><strong>Document number: {number}</strong><br />Shipping date: {record.shippingDate}<br />Status: {record.status}{record.status === "Draft" ? " · PREVIEW — NOT DISPATCHED" : ""}</p>
        <Barcode number={number} />
        {record.status === "Cancelled" && <p><strong>CANCELLED</strong> · {record.cancellationReason}<br />Cancelled: {record.cancelledAt ? new Date(record.cancelledAt).toLocaleString() : ""}</p>}
      </header>
      <section><h2>Deliver to</h2>
        <p><strong>{customer?.code || "Customer not selected"} · {customer?.name || ""}</strong><br />{site?.name || "Site not selected"}{site?.department ? ` · ${site.department}` : ""}<br />{site?.address || ""}<br />{customer?.contact ? `Contact: ${customer.contact}` : ""} {customer?.phone || ""}</p>
        {record.route && <p>Route/reference: {record.route}</p>}
      </section>
      <table border={1} cellPadding={5}><thead><tr><th>Cart / reference</th><th>Item code</th><th>Description</th><th>Ownership</th><th>Clean quantity</th><th>Bundle conversion / pieces</th></tr></thead><tbody>
        {record.carts.flatMap((cart, index) => cart.lines.length ? cart.lines.map(line => <tr key={line.id}>
          <td>Cart {String(index + 1).padStart(2, "0")}<br />Ref: {cart.reference || "—"}</td>
          <td>{line.code}</td><td>{line.description}</td><td>{ownerLabel(line.ownership)}</td><td>{fmt(line.quantity)} {line.unit}</td>
          <td>{line.unit === "bundles" ? `${fmt(line.quantity)} × ${line.bundleSize} = ${fmt(line.equivalentPieces || 0)} pieces` : line.unit === "pieces" ? `${fmt(line.quantity)} pieces` : "Weight-based"}</td>
        </tr>) : [<tr key={cart.id}><td>Cart {index + 1} · {cart.reference || "—"}</td><td colSpan={5}>No lines · draft only</td></tr>])}
      </tbody></table>
      <section><h2>Quantity totals</h2>
        <table border={1} cellPadding={5}><thead><tr><th>Ownership</th><th>Equivalent pieces</th><th>Weight-based linen (kg)</th><th>Weight-based linen (lb)</th></tr></thead><tbody>
          <tr><td>Customer-owned</td><td>{fmt(t.customerPieces)}</td><td>{fmt(t.ownershipWeights.customer.kg)} kg</td><td>{fmt(t.ownershipWeights.customer.lb)} lb</td></tr>
          <tr><td>Laundry Pool</td><td>{fmt(t.poolPieces)}</td><td>{fmt(t.ownershipWeights.pool.kg)} kg</td><td>{fmt(t.ownershipWeights.pool.lb)} lb</td></tr>
          <tr><th>Total</th><th>{fmt(t.pieces)} pieces</th><th>{fmt(t.weights.kg)} kg</th><th>{fmt(t.weights.lb)} lb</th></tr>
        </tbody></table><p>Cart count: <strong>{t.carts}</strong>. Bundle entries are included as equivalent pieces. Weight-based quantities remain separate.</p>
      </section>
      <section><h2>Cart weighing</h2>
        {t.weighedCarts ? <table border={1} cellPadding={5}><thead><tr><th>Cart / reference</th><th>Tare</th><th>Gross</th><th>Net</th></tr></thead><tbody>
          {record.carts.map((cart, i) => cart.tare !== null && cart.gross !== null ? <tr key={cart.id}><td>Cart {i + 1} · {cart.reference || "—"}</td><td>{fmt(cart.tare)} {cart.weightUnit}</td><td>{fmt(cart.gross)} {cart.weightUnit}</td><td>{fmt(cart.gross - cart.tare)} {cart.weightUnit}</td></tr> : null)}
          {(["kg", "lb"] as const).filter(u => t.cartWeights[u].count).map(u => <tr key={u}><th>Total · {t.cartWeights[u].count} carts</th><th>{fmt(t.cartWeights[u].tare)} {u}</th><th>{fmt(t.cartWeights[u].gross)} {u}</th><th>{fmt(t.cartWeights[u].net)} {u}</th></tr>)}
        </tbody></table> : <p>Cart weighing not recorded.</p>}
        {record.carts.some(c => c.comments) && <ul>{record.carts.filter(c => c.comments).map((c) => <li key={c.id}>Cart {record.carts.indexOf(c) + 1} ({c.reference || "no reference"}): {c.comments}</li>)}</ul>}
      </section>
      {record.notes && <p><strong>Dispatch notes:</strong> {record.notes}</p>}
      <div className="signatures"><div><strong>Driver signature</strong><p>____________________________</p><p>Name: ______________________</p></div><div><strong>Receiver signature</strong><p>____________________________</p><p>Name: ______________________</p><p>Received date: _______________</p></div></div>
      <footer><p>Created by: {snapshot?.createdBy || record.createdBy}<br />Created: {new Date(record.createdAt).toLocaleString()}{record.confirmedAt ? ` · Confirmed: ${new Date(record.confirmedAt).toLocaleString()}` : ""}</p><p>Thank you for choosing {company.name}.</p></footer>
    </article>;
}
