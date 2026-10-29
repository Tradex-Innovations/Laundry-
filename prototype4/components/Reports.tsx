"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Database, Dispatch, Filters } from "../lib/types";
import { csvText, emptyFilters, filterDispatches, fmt, operational, ownerLabel, totals } from "../lib/domain";
import { DispatchFilters } from "./History";
import { Field, QuantitySummary } from "./shared";

const reportNames = ["Daily dispatch summary", "Customer dispatch history", "Quantities dispatched by item", "Customer-owned linen returned", "Pool linen issued"] as const;
type ReportName = typeof reportNames[number];
type Row = (string | number)[];

export function buildRows(db: Database, records: Dispatch[], report: ReportName): { headers: Row; rows: Row[] } {
  if (report === "Daily dispatch summary") {
    const headers = ["Shipping date", "Dispatches", "Customers", "Cart entries", "Customer-owned pieces", "Pool pieces", "Total equivalent pieces", "Customer-owned kg", "Pool kg", "Customer-owned lb", "Pool lb"];
    const days = [...new Set(records.map(d => d.shippingDate))].sort().reverse();
    return { headers, rows: days.map(day => {
      const list = records.filter(d => d.shippingDate === day); const t = totals(list);
      return [day, list.length, new Set(list.map(d => d.customerId)).size, t.carts, t.customerPieces, t.poolPieces, t.pieces, t.ownershipWeights.customer.kg, t.ownershipWeights.pool.kg, t.ownershipWeights.customer.lb, t.ownershipWeights.pool.lb];
    }) };
  }
  if (report === "Customer dispatch history") return {
    headers: ["Document", "Shipping date", "Customer code", "Customer", "Delivery site", "Status", "Carts", "Customer-owned pieces", "Pool pieces", "Customer-owned kg", "Pool kg", "Customer-owned lb", "Pool lb"],
    rows: records.map(d => {
      const customer = d.snapshot?.customer || db.customers.find(c => c.id === d.customerId); const t = totals([d]);
      return [d.number, d.shippingDate, customer?.code || "", customer?.name || "", d.snapshot?.site.name || "", d.status, t.carts, t.customerPieces, t.poolPieces, t.ownershipWeights.customer.kg, t.ownershipWeights.pool.kg, t.ownershipWeights.customer.lb, t.ownershipWeights.pool.lb];
    }),
  };
  const grouped = new Map<string, { code: string; description: string; ownership: string; unit: string; bundleSize: number | null; quantity: number; pieces: number | null; status: string }>();
  for (const d of records) for (const c of d.carts) for (const l of c.lines) {
    if (report === "Customer-owned linen returned" && l.ownership !== "customer") continue;
    if (report === "Pool linen issued" && l.ownership !== "pool") continue;
    const key = JSON.stringify([l.itemId, l.code, l.description, l.ownership, l.unit, l.bundleSize, d.status]);
    const row = grouped.get(key) || { code: l.code, description: l.description, ownership: ownerLabel(l.ownership), unit: l.unit, bundleSize: l.bundleSize, quantity: 0, pieces: l.equivalentPieces === null ? null : 0, status: d.status };
    row.quantity += l.quantity;
    if (row.pieces !== null) row.pieces += l.equivalentPieces || 0;
    grouped.set(key, row);
  }
  return { headers: ["Item code", "Description", "Ownership", "Status", "Entered quantity", "Unit", "Pieces per bundle used", "Equivalent pieces"], rows: [...grouped.values()].sort((a, b) => a.code.localeCompare(b.code)).map(r => [r.code, r.description, r.ownership, r.status, r.quantity, r.unit, r.bundleSize ?? "", r.pieces ?? ""]) };
}

export default function Reports({ db }: { db: Database }) {
  const [report, setReport] = useState<ReportName>("Daily dispatch summary");
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const records = filterDispatches(operational(db, includeCancelled), filters);
  const { headers, rows } = useMemo(() => buildRows(db, records, report), [db, records, report]);
  const ownership = report === "Customer-owned linen returned" ? "customer" : report === "Pool linen issued" ? "pool" : null;
  const summaryRecords = ownership ? records.map(d => ({ ...d, carts: d.carts.map(c => ({ ...c, lines: c.lines.filter(l => l.ownership === ownership), tare: null, gross: null })) })) : records;
  function exportCsv() {
    const blob = new Blob([csvText([headers, ...rows])], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = `${report.toLowerCase().replaceAll(" ", "-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="!mb-2">Reports</h1><p className="!mt-0 !text-xs">The details behind every dispatch, ready when you need them.</p></div><button className="btn-primary" onClick={exportCsv}><Download size={15} />Export CSV</button></div>
    <Field label="Report"><select value={report} onChange={e => setReport(e.target.value as ReportName)}>{reportNames.map(name => <option key={name}>{name}</option>)}</select></Field>
    <DispatchFilters db={db} value={filters} onChange={setFilters} status={false} />
    <p><label><input type="checkbox" checked={includeCancelled} onChange={e => setIncludeCancelled(e.target.checked)} /> Include cancelled records in displayed totals</label></p>
    <p>{includeCancelled ? "Displayed totals include cancelled records." : "Operational totals exclude cancelled records."} Drafts are always excluded. Filters use shipping dates.</p>
    {report === "Customer-owned linen returned" && <p>This report shows clean customer-owned linen dispatched back to the customer through Linen Out.</p>}
    <h2>{report}</h2><p>{records.length} matching dispatches · {rows.length} report rows</p>
    {rows.length ? <div className="table-scroll"><table><thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{typeof v === "number" ? fmt(v) : v === "" ? "—" : v}</td>)}</tr>)}</tbody></table></div> : <p>No dispatched linen matches these filters.</p>}
    <h2>Filtered quantity totals</h2><QuantitySummary records={summaryRecords} />
  </section>;
}
