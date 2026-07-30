import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { usePrivacy } from "../../context/PrivacyContext";
import { Users, Search, ArrowRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";

/**
 * Customer Ledger — shows every customer with their outstanding balance,
 * total business done and quick link into party statement.
 */
export default function CustomerLedger() {
  const navigate = useNavigate();
  const { hidden: privacyOn } = usePrivacy();
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const money = (v) => (privacyOn ? "••••••" : formatMoney(v, "INR"));

  const load = async () => {
    setLoading(true);
    try {
      const [p, inv] = await Promise.all([
        http.get("/parties").then((r) => r.data).catch(() => []),
        http.get("/billing/invoices").then((r) => r.data).catch(() => []),
      ]);
      setParties(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(inv) ? inv : []);
    } catch (e) {
      toast.error("Ledger load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const customerRows = useMemo(() => {
    const customers = parties.filter(
      (p) => (p.party_type || p.type || "customer") === "customer"
    );
    const SALES = new Set([
      "tax",
      "gst",
      "sale",
      "quotation",
      "proforma",
      "challan",
      "sales-order",
      "credit",
    ]);
    const map = new Map();
    for (const c of customers) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        gstin: c.gstin,
        totalSales: 0,
        outstanding: 0,
        invoiceCount: 0,
      });
    }
    for (const inv of invoices) {
      const t = String(inv.invoice_type || "tax").toLowerCase();
      if (!SALES.has(t)) continue;
      const pid = inv.party_id || inv.customer_id;
      if (!pid || !map.has(pid)) continue;
      const total = Number(inv.grand_total || inv.total || 0);
      const paid = Number(inv.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      const row = map.get(pid);
      row.totalSales += total;
      row.outstanding += balance;
      row.invoiceCount += 1;
    }
    let rows = Array.from(map.values());
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(needle) ||
          (r.phone || "").toLowerCase().includes(needle) ||
          (r.gstin || "").toLowerCase().includes(needle)
      );
    }
    rows.sort((a, b) => b.outstanding - a.outstanding);
    return rows;
  }, [parties, invoices, q]);

  const totals = useMemo(() => {
    return customerRows.reduce(
      (acc, r) => {
        acc.sales += r.totalSales;
        acc.outstanding += r.outstanding;
        return acc;
      },
      { sales: 0, outstanding: 0 }
    );
  }, [customerRows]);

  return (
    <div className="space-y-4" data-testid="customer-ledger-page">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Customer Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Har customer ka outstanding aur total business ek jagah.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Sales
            </div>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {money(totals.sales)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Outstanding
            </div>
            <div className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {money(totals.outstanding)}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search by name / phone / GSTIN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="customer-ledger-search"
          className="pl-9 pr-3 py-2 w-full max-w-md text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading…</div>
        ) : customerRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Koi customer nahi mila. Pehle Parties me customer add karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Customer</th>
                  <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">
                    Phone / GSTIN
                  </th>
                  <th className="text-right px-4 py-2 font-semibold hidden md:table-cell">
                    Invoices
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">
                    Total Sales
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">
                    Outstanding
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {customerRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => navigate(`/billing/parties?id=${r.id}`)}
                    data-testid={`customer-ledger-row-${r.id}`}
                  >
                    <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">
                      {r.name || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                      {r.phone || "—"}
                      {r.gstin ? (
                        <span className="ml-1 text-[10px] text-slate-400">
                          · {r.gstin}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">
                      {r.invoiceCount}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {money(r.totalSales)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                      {money(r.outstanding)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ArrowRight className="w-3.5 h-3.5 inline text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
