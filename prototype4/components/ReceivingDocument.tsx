"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Printer } from "lucide-react";
import type { Database, Receipt } from "../lib/types";
import { fmt } from "../lib/domain";
import { receiptWeightLabel } from "../lib/receiving";

export function ReceivingLines({ record }: { record: Receipt }) {
  if (record.lines === undefined) return <p className="!text-xs">This earlier receipt contains batch totals. Item details were not recorded.</p>;
  return <div className="table-scroll"><table><thead><tr><th>Item no.</th><th>Item</th><th>Category</th><th>Quantity</th><th>Item weight ({record.weightUnit})</th></tr></thead><tbody>{record.lines.map(line => <tr key={line.id}><td>{line.code}</td><td>{line.description}</td><td>{line.categoryName || "—"}</td><td>{fmt(line.quantity)} pieces</td><td>{line.weight === null ? "—" : `${fmt(line.weight)} ${record.weightUnit}`}</td></tr>)}</tbody></table></div>;
}
export function ReceivingRecord({ record }: { record: Receipt }) {
  return <div className="receiving-record">
    <span className="status-badge bg-pool-50 text-pool-700">Received</span><h3>{record.customerName}</h3><p>{record.siteName} · {record.receivedDate}</p>
    <dl className="receiving-record-totals"><div><dt>{record.lines === undefined ? "Bags / carts" : "Cart number"}</dt><dd>{record.lines === undefined ? fmt(record.containers) : record.reference}</dd></div><div><dt>Total pieces</dt><dd>{fmt(record.pieces)}</dd></div><div><dt>Net cart weight</dt><dd>{receiptWeightLabel(record)}</dd></div></dl>
    <ReceivingLines record={record} />
    {record.lines !== undefined && record.gross != null && record.tare != null && <p>Tare: {fmt(record.tare)} {record.weightUnit} · Gross: {fmt(record.gross)} {record.weightUnit} · Net: {receiptWeightLabel(record)}</p>}
    <p>Reference: {record.reference || "—"}<br />Notes: {record.notes || "—"}</p><p className="!text-xs">Recorded by {record.createdBy} · {new Date(record.createdAt).toLocaleString()}</p>
  </div>;
}
export function IncomingReceiptDocument({ db, record }: { db: Database; record: Receipt }) {
  const company = record.snapshot?.company || db.company;
  const site = record.snapshot?.site;
  const customer = record.snapshot?.customer;
  return <article className="manifest" aria-label="Incoming linen receipt">
    <header>{company.logo && <img src={company.logo} alt={`${company.name} logo`} width={100} />}<h2>{company.name}</h2><p>{company.address}<br />{company.phone} · {company.email}</p><h1>Incoming Linen Receipt</h1><p><strong>{record.number}</strong><br />Received date: {record.receivedDate}<br />Status: Received</p></header>
    <h2>Received from</h2><p><strong>{customer?.code ? `${customer.code} · ` : ""}{record.customerName}</strong><br />{record.siteName}{site?.department ? ` · ${site.department}` : ""}<br />{site?.address || ""}</p>
    <p>{record.lines === undefined ? `Bags / carts: ${record.containers}` : `Cart number: ${record.reference}`}</p>
    <ReceivingLines record={record} />
    <h2>Receipt totals</h2><table><tbody><tr><th>Pieces received</th><td>{fmt(record.pieces)}</td></tr>{record.lines !== undefined && record.gross != null && <><tr><th>Tare weight</th><td>{fmt(record.tare || 0)} {record.weightUnit}</td></tr><tr><th>Gross weight</th><td>{fmt(record.gross)} {record.weightUnit}</td></tr></>}<tr><th>Net cart weight</th><td>{receiptWeightLabel(record)}</td></tr></tbody></table>
    <p>Cart weighing is separate from individual item weights. Item weights are not estimated from piece counts.</p>{record.notes && <p>Notes: {record.notes}</p>}
    <div className="signatures"><div><strong>Received by</strong><p>____________________________</p><p>Name: ______________________</p></div><div><strong>Delivered by</strong><p>____________________________</p><p>Name: ______________________</p></div></div><footer><p>Recorded by {record.createdBy}<br />{new Date(record.createdAt).toLocaleString()}</p></footer>
  </article>;
}
export default function ReceivingPrintPreview({ db, record, onClose }: { db: Database; record: Receipt; onClose: () => void }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => { const node = document.createElement("div"); node.className = "manifest-print-root"; document.body.append(node); setContainer(node); return () => node.remove(); }, []);
  if (!container) return null;
  return createPortal(<><div className="no-print mb-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button onClick={onClose}><ArrowLeft size={17} />Close receipt preview</button><button className="btn-primary" onClick={() => window.print()}><Printer size={17} />Print / Save as PDF</button></div><p className="rounded-xl border border-line bg-brand-50 px-4 py-3 text-xs text-muted">Receipt saved. Choose a printer or Save as PDF from the print dialog.</p></div><IncomingReceiptDocument db={db} record={record} /></>, container);
}
