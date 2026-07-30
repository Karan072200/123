import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrivacy } from "../../context/PrivacyContext";
import { http, formatMoney } from "@/lib/api";
import { toast } from "sonner";
import {
  FileText,
  ShoppingBag,
  Boxes,
  Plus,
  RefreshCw,
  ArrowRight,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Users,
  ScrollText,
  ReceiptText,
} from "lucide-react";

/**
 * Compute the current Indian Financial Year (Apr–Mar).
 * Example: today 2026-02-15 -> "2025-26"
 */
function currentFY(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1..12
  const startYear = m >= 4 ? y : y - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

function fyOptions(n = 4) {
  const now = new Date();
  const cur = currentFY(now);
  const startYear = parseInt(cur.split("-")[0], 10);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const s = startYear - i;
    const e = String((s + 1) % 100).padStart(2, "0");
    arr.push(`${s}-${e}`);
  }
  return arr;
}

function fyRange(fy) {
  const startYear = parseInt(fy.split("-")[0], 10);
  return {
    start: new Date(startYear, 3, 1), // April 1
    end: new Date(startYear + 1, 2, 31, 23, 59, 59), // March 31
  };
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const StatCard = ({ label, value, sub, tone = "slate", icon: Icon, onClick }) => {
  const tones = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    rose: "text-rose-700 dark:text-rose-400",
    amber: "text-amber-700 dark:text-amber-400",
    sky: "text-sky-700 dark:text-sky-400",
    slate: "text-slate-800 dark:text-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-emerald-500 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {Icon ? <Icon className="w-4 h-4 text-slate-400" /> : null}
      </div>
      <div className={`text-xl font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{sub}</div> : null}
    </button>
  );
};

export default function BillingDashboardWorkspace() {
  const navigate = useNavigate();
  const { hidden: privacyOn } = usePrivacy();

  const [fy, setFy] = useState(currentFY());
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [udhaar, setUdhaar] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0 });

  const money = (v) => (privacyOn ? "••••••" : formatMoney(v, "INR"));

  const load = async () => {
    setLoading(true);
    try {
      const [inv, ud, prd, sum] = await Promise.all([
        http.get("/billing/invoices").then((r) => r.data).catch(() => []),
        http.get("/udhaar").then((r) => r.data).catch(() => []),
        http.get("/products").then((r) => r.data).catch(() => []),
        http.get("/analytics/summary").then((r) => r.data).catch(() => ({})),
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setUdhaar(Array.isArray(ud) ? ud : []);
      setProducts(Array.isArray(prd) ? prd : []);
      setSummary(sum || {});
    } catch (e) {
      toast.error("Billing dashboard load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fyBounds = useMemo(() => fyRange(fy), [fy]);

  const metrics = useMemo(() => {
    const inFy = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= fyBounds.start && d <= fyBounds.end;
    };

    let totalSales = 0;
    let totalPurchase = 0;
    let salesGst = 0;
    let purchaseGst = 0;
    let totalReceivable = 0;
    let totalPayable = 0;
    let todaySales = 0;
    let todayReceipts = 0;
    const today = todayISODate();

    const SALES_TYPES = new Set(["tax", "gst", "sale", "quotation", "proforma", "challan", "sales-order", "credit"]);
    const PURCHASE_TYPES = new Set(["purchase", "purchase-order", "debit"]);

    for (const inv of invoices) {
      const dt = inv.invoice_date || inv.created_at;
      if (!inFy(dt)) continue;
      const total = Number(inv.grand_total || inv.total || 0);
      const gst = Number(inv.total_tax || inv.gst_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      const t = String(inv.invoice_type || "tax").toLowerCase();

      if (SALES_TYPES.has(t)) {
        totalSales += total;
        salesGst += gst;
        totalReceivable += balance;
        if ((dt || "").slice(0, 10) === today) {
          todaySales += total;
          todayReceipts += paid;
        }
      } else if (PURCHASE_TYPES.has(t)) {
        totalPurchase += total;
        purchaseGst += gst;
        totalPayable += balance;
      }
    }

    // Also fold in generic udhaar (Aaya/Gaya) pending balances as receivable/payable
    for (const u of udhaar) {
      if ((u.status || "pending") !== "pending") continue;
      const amt = Number(u.amount || 0);
      if (u.type === "lene") totalReceivable += amt;
      else if (u.type === "dene") totalPayable += amt;
    }

    const stockValue = products.reduce((acc, p) => {
      const qty = Number(p.stock ?? p.opening_stock ?? 0);
      const rate = Number(p.purchase_price ?? p.price ?? 0);
      return acc + qty * rate;
    }, 0);

    return {
      totalSales,
      totalPurchase,
      salesGst,
      purchaseGst,
      totalReceivable,
      totalPayable,
      totalOutstanding: totalReceivable - totalPayable,
      todaySales,
      todayReceipts,
      stockValue,
    };
  }, [invoices, udhaar, products, fyBounds]);

  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 6),
    [invoices]
  );

  return (
    <div className="space-y-6">
      {/* Top control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Financial Year</label>
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="text-xs font-semibold border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              data-testid="billing-fy-select"
            >
              {fyOptions(5).map((f) => (
                <option key={f} value={f}>{`FY ${f}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            data-testid="billing-refresh-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate("/billing/invoices/new?type=tax")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-sm"
            data-testid="billing-new-invoice-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Sales"
          value={money(metrics.totalSales)}
          sub={`GST ${money(metrics.salesGst)}`}
          tone="emerald"
          icon={TrendingUp}
          onClick={() => navigate("/billing/invoices")}
        />
        <StatCard
          label="Total Purchase"
          value={money(metrics.totalPurchase)}
          sub={`GST ${money(metrics.purchaseGst)}`}
          tone="rose"
          icon={TrendingDown}
          onClick={() => navigate("/billing/invoices?type=purchase")}
        />
        <StatCard
          label="Receivables"
          value={money(metrics.totalReceivable)}
          sub="Customer outstanding"
          tone="amber"
          icon={ReceiptText}
          onClick={() => navigate("/billing/outstanding?type=customer")}
        />
        <StatCard
          label="Payables"
          value={money(metrics.totalPayable)}
          sub="Supplier outstanding"
          tone="sky"
          icon={ScrollText}
          onClick={() => navigate("/billing/outstanding?type=supplier")}
        />
      </div>

      {/* Secondary metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today's Sales" value={money(metrics.todaySales)} tone="emerald" icon={IndianRupee} onClick={() => navigate("/billing/invoices")} />
        <StatCard label="Today's Receipts" value={money(metrics.todayReceipts)} tone="emerald" icon={IndianRupee} onClick={() => navigate("/billing/payments?type=received")} />
        <StatCard label="Stock Value" value={money(metrics.stockValue)} sub={`${products.length} products`} tone="amber" icon={Boxes} onClick={() => navigate("/billing/inventory")} />
        <StatCard label="Net Outstanding" value={money(metrics.totalOutstanding)} tone={metrics.totalOutstanding >= 0 ? "emerald" : "rose"} icon={Users} onClick={() => navigate("/billing/outstanding")} />
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            { title: "Sale Invoice", path: "/billing/invoices/new?type=tax", icon: FileText },
            { title: "GST Invoice", path: "/billing/invoices/new?type=gst", icon: FileText },
            { title: "Quotation", path: "/billing/invoices/new?type=quotation", icon: FileText },
            { title: "Proforma", path: "/billing/invoices/new?type=proforma", icon: FileText },
            { title: "Delivery Challan", path: "/billing/invoices/new?type=challan", icon: FileText },
            { title: "Sale Order", path: "/billing/invoices/new?type=sales-order", icon: FileText },
            { title: "Credit Note", path: "/billing/invoices/new?type=credit", icon: FileText },
            { title: "Purchase Order", path: "/billing/invoices/new?type=purchase-order", icon: ShoppingBag },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-md text-left hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
              >
                <div className="w-7 h-7 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{card.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent Invoices</h3>
          <button
            onClick={() => navigate("/billing/invoices")}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {loading ? "Loading…" : "No invoices yet. Click Create → Sale Invoice to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Invoice #</th>
                  <th className="text-left px-4 py-2 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 font-semibold">Party</th>
                  <th className="text-right px-4 py-2 font-semibold">Total</th>
                  <th className="text-right px-4 py-2 font-semibold">Balance</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => {
                  const total = Number(inv.grand_total || inv.total || 0);
                  const paid = Number(inv.paid_amount || 0);
                  const balance = Math.max(0, total - paid);
                  const status = balance === 0 && total > 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => navigate(`/billing/invoices/${inv.id}/edit`)}
                    >
                      <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{inv.invoice_number || "—"}</td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{(inv.invoice_date || inv.created_at || "").slice(0, 10)}</td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{inv.party_name || inv.customer_name || "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{money(total)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(balance)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : status === "Partial"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
