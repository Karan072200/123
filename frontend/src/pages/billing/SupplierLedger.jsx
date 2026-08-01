import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { usePrivacy } from "../../context/PrivacyContext";
import { Users, Search, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadPartyStatement } from "@/lib/partyStatement";

/**
 * Supplier Ledger — shows every supplier with payable balance and total
 * purchase business done.
 */
export default function SupplierLedger() {
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
        http.get("/billing/suppliers").then((r) => r.data),
        http.get("/billing/invoices").then((r) => r.data).catch(() => []),
      ]);
      setParties(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(inv) ? inv : []);
    } catch (e) {
      toast.error("Supplier ledger load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const supplierRows = useMemo(() => {
    // /billing/suppliers already returns only suppliers
    const suppliers = parties;
    const PURCHASE = new Set(["purchase", "purchase-order", "debit"]);
    const map = new Map();
    for (const s of suppliers) {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        phone: s.phone,
        gstin: s.gstin,
        totalPurchase: 0,
        payable: 0,
        invoiceCount: 0,
      });
    }
    for (const inv of invoices) {
      const t = String(inv.invoice_type || "").toLowerCase();
      if (!PURCHASE.has(t)) continue;
      const pid = inv.party_id || inv.supplier_id;
      if (!pid || !map.has(pid)) continue;
      const total = Number(inv.grand_total || inv.total || 0);
      const paid = Number(inv.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      const row = map.get(pid);
      row.totalPurchase += total;
      row.payable += balance;
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
    rows.sort((a, b) => b.payable - a.payable);
    return rows;
  }, [parties, invoices, q]);

  const totals = useMemo(() => {
    return supplierRows.reduce(
      (acc, r) => {
        acc.purchase += r.totalPurchase;
        acc.payable += r.payable;
        return acc;
      },
      { purchase: 0, payable: 0 }
    );
  }, [supplierRows]);

  return (
    <div className="space-y-4" data-testid="supplier-ledger-page">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Supplier Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Har supplier ka payable aur total purchase business.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Purchase
            </div>
            <div className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">
              {money(totals.purchase)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Payable
            </div>
            <div className="text-base font-bold text-sky-700 dark:text-sky-400 tabular-nums">
              {money(totals.payable)}
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
          data-testid="supplier-ledger-search"
          className="pl-9 pr-3 py-2 w-full max-w-md text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading…</div>
        ) : supplierRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Koi supplier nahi mila. Pehle Parties me supplier add karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Supplier</th>
                  <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">
                    Phone / GSTIN
                  </th>
                  <th className="text-right px-4 py-2 font-semibold hidden md:table-cell">
                    Bills
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">
                    Total Purchase
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Payable</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {supplierRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => navigate(`/billing/parties/${r.id}`)}
                    data-testid={`supplier-ledger-row-${r.id}`}
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
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {money(r.totalPurchase)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-sky-700 dark:text-sky-400">
                      {money(r.payable)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => downloadPartyStatement(r.id, r.name)}
                        title="Download Statement PDF"
                        data-testid={`supplier-ledger-statement-${r.id}`}
                        className="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded text-sky-700 dark:text-sky-400"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <ArrowRight className="w-3.5 h-3.5 inline text-slate-400 ml-1" />
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
