import React, { useEffect, useMemo, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BarChart3, TrendingUp, Calendar, Receipt, IndianRupee } from "lucide-react";

const TABS = [
  { key: "daily", label: "Daily Sales" },
  { key: "monthly", label: "Monthly Sales" },
  { key: "gst", label: "GST Report" },
  { key: "profit", label: "Profit Report" },
];

export default function BillingReports() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [tab, setTab] = useState("daily");
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    Promise.all([http.get("/billing/invoices"), http.get("/billing/purchases").catch(() => ({ data: [] }))])
      .then(([i, p]) => { setInvoices(i.data || []); setPurchases(p.data || []); });
  }, []);

  const finalInvoices = invoices.filter((i) => i.status === "final" && ["tax", "gst"].includes(i.invoice_type));

  // Daily aggregation (last 30 days)
  const daily = useMemo(() => {
    const map = {};
    finalInvoices.forEach((inv) => {
      const d = new Date(inv.invoice_date).toISOString().slice(0, 10);
      map[d] = map[d] || { date: d, sales: 0, count: 0 };
      map[d].sales += Number(inv.total || 0);
      map[d].count += 1;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [finalInvoices]);

  // Monthly aggregation
  const monthly = useMemo(() => {
    const map = {};
    finalInvoices.forEach((inv) => {
      const m = new Date(inv.invoice_date).toISOString().slice(0, 7);
      map[m] = map[m] || { month: m, sales: 0, tax: 0, count: 0 };
      map[m].sales += Number(inv.total || 0);
      map[m].tax += Number(inv.tax || 0);
      map[m].count += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [finalInvoices]);

  // GST by rate
  const gstByRate = useMemo(() => {
    const map = {};
    finalInvoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const rate = Number(it.gst_rate || 0);
        const line = Number(it.qty || 0) * Number(it.price || 0) * (1 - Number(it.discount_pct || 0) / 100);
        const taxable = inv.gst_mode === "inclusive" && rate ? line / (1 + rate / 100) : line;
        const tax = rate ? (inv.gst_mode === "inclusive" ? line - taxable : line * rate / 100) : 0;
        map[rate] = map[rate] || { rate, taxable: 0, tax: 0 };
        map[rate].taxable += taxable;
        map[rate].tax += tax;
      });
    });
    return Object.values(map).sort((a, b) => a.rate - b.rate);
  }, [finalInvoices]);

  const totalSales = finalInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPurchase = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
  const profit = totalSales - totalPurchase;

  const csv = () => {
    let rows = [];
    if (tab === "daily") { rows.push(["Date", "Sales", "Invoices"]); daily.forEach((d) => rows.push([d.date, d.sales, d.count])); }
    else if (tab === "monthly") { rows.push(["Month", "Sales", "Tax", "Invoices"]); monthly.forEach((m) => rows.push([m.month, m.sales, m.tax, m.count])); }
    else if (tab === "gst") { rows.push(["GST%", "Taxable", "Tax Collected"]); gstByRate.forEach((g) => rows.push([g.rate, g.taxable.toFixed(2), g.tax.toFixed(2)])); }
    else { rows.push(["Metric", "Amount"]); rows.push(["Total Sales", totalSales], ["Total Purchase", totalPurchase], ["Gross Profit", profit]); }
    const csvStr = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${tab}-report.csv`; a.click();
  };

  return (
    <div className="space-y-4" data-testid="billing-reports-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#2A4F4F]" /> Billing Reports
          </h1>
          <p className="text-[#78716C] mt-1">Sales, GST, aur Profit ka poora analysis</p>
        </div>
        <button onClick={csv} data-testid="export-csv-btn"
          className="text-sm px-4 py-2 rounded-lg bg-[#2A4F4F] text-white hover:bg-[#1F3939]">
          Export CSV
        </button>
      </div>

      <div className="flex gap-2 border-b border-[#E7E5DF] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={`report-tab-${t.key}`}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-[#2A4F4F] text-[#2A4F4F]" : "border-transparent text-[#78716C] hover:text-[#1C1917]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F9F8F6] text-xs uppercase text-[#78716C]">
              <tr><th className="text-left p-3">Date</th><th className="text-right p-3">Invoices</th><th className="text-right p-3">Total Sales</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF]">
              {daily.length === 0 ? <tr><td colSpan="3" className="p-6 text-center text-[#78716C]">No data</td></tr> :
                daily.map((d) => (
                  <tr key={d.date}><td className="p-3">{new Date(d.date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 text-right">{d.count}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(d.sales, cur)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "monthly" && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F9F8F6] text-xs uppercase text-[#78716C]">
              <tr><th className="text-left p-3">Month</th><th className="text-right p-3">Invoices</th><th className="text-right p-3">Tax</th><th className="text-right p-3">Sales</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF]">
              {monthly.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-[#78716C]">No data</td></tr> :
                monthly.map((m) => (
                  <tr key={m.month}><td className="p-3">{m.month}</td>
                    <td className="p-3 text-right">{m.count}</td>
                    <td className="p-3 text-right text-[#78716C]">{formatMoney(m.tax, cur)}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(m.sales, cur)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "gst" && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F9F8F6] text-xs uppercase text-[#78716C]">
              <tr><th className="text-left p-3">GST Rate</th><th className="text-right p-3">Taxable Value</th><th className="text-right p-3">Tax Collected</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF]">
              {gstByRate.length === 0 ? <tr><td colSpan="3" className="p-6 text-center text-[#78716C]">No data</td></tr> :
                gstByRate.map((g) => (
                  <tr key={g.rate}><td className="p-3">{g.rate}%</td>
                    <td className="p-3 text-right">{formatMoney(g.taxable, cur)}</td>
                    <td className="p-3 text-right font-semibold text-[#B8763A]">{formatMoney(g.tax, cur)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "profit" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#3B6446] to-[#2C4C33] text-white rounded-xl p-5">
            <div className="text-xs uppercase opacity-80">Total Sales</div>
            <div className="font-heading text-3xl font-bold mt-2">{formatMoney(totalSales, cur)}</div>
            <div className="text-xs opacity-80 mt-1">{finalInvoices.length} invoices</div>
          </div>
          <div className="bg-gradient-to-br from-[#D96C52] to-[#B15039] text-white rounded-xl p-5">
            <div className="text-xs uppercase opacity-80">Total Purchase</div>
            <div className="font-heading text-3xl font-bold mt-2">{formatMoney(totalPurchase, cur)}</div>
            <div className="text-xs opacity-80 mt-1">{purchases.length} orders</div>
          </div>
          <div className={`rounded-xl p-5 text-white bg-gradient-to-br ${profit >= 0 ? "from-[#2A4F4F] to-[#1F3939]" : "from-[#8B6220] to-[#5C4114]"}`}>
            <div className="text-xs uppercase opacity-80">Gross Profit</div>
            <div className="font-heading text-3xl font-bold mt-2">{formatMoney(profit, cur)}</div>
            <div className="text-xs opacity-80 mt-1">{profit >= 0 ? "Profit ✓" : "Loss ✗"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
