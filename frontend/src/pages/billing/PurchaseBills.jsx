import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { usePrivacy } from "../../context/PrivacyContext";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Printer,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Purchase Bills — first-class page for supplier bills (invoice_type == "purchase").
 * Distinct from the generic Invoices list which is sales-first.
 */
export default function PurchaseBills() {
  const navigate = useNavigate();
  const { hidden: privacyOn } = usePrivacy();
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const money = (v) => (privacyOn ? "••••••" : formatMoney(v, "INR"));

  const load = async () => {
    setLoading(true);
    try {
      const [inv, sup] = await Promise.all([
        http.get("/billing/invoices").then((r) => r.data),
        http.get("/billing/suppliers").then((r) => r.data).catch(() => []),
      ]);
      const purchases = (inv || []).filter((i) =>
        String(i.invoice_type || "").toLowerCase() === "purchase"
      );
      setBills(purchases);
      setSuppliers(sup || []);
    } catch (e) {
      toast.error("Purchase bills load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return bills;
    const needle = q.trim().toLowerCase();
    return bills.filter(
      (b) =>
        (b.invoice_number || "").toLowerCase().includes(needle) ||
        (b.customer_name || "").toLowerCase().includes(needle)
    );
  }, [bills, q]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => {
        acc.total += Number(b.total || 0);
        acc.paid += Number(b.paid_amount || 0);
        acc.due += Number(b.balance_due || 0);
        return acc;
      },
      { total: 0, paid: 0, due: 0 }
    );
  }, [filtered]);

  const remove = async (id) => {
    if (!window.confirm("Delete this purchase bill?")) return;
    try {
      await http.delete(`/billing/invoices/${id}`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-4" data-testid="purchase-bills-page">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Purchase Bills
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supplier ke saare bills, GST + ITC tracking ke saath.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/billing/invoices/new?type=purchase")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-sm"
          data-testid="purchase-bills-new-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Purchase Bill</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Purchase
          </div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">
            {money(totals.total)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Paid
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {money(totals.paid)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold">
            Payable
          </div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1 tabular-nums">
            {money(totals.due)}
          </div>
        </div>
      </div>

      <input
        placeholder="Search bill # / supplier name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        data-testid="purchase-bills-search"
        className="px-3 py-2 w-full max-w-md text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Koi purchase bill nahi. New Purchase Bill click karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Bill #</th>
                  <th className="text-left px-4 py-2 font-semibold">Supplier</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Total</th>
                  <th className="text-right px-4 py-2 font-semibold hidden sm:table-cell">
                    Paid
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Balance</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    data-testid={`purchase-bill-${b.id}`}
                  >
                    <td className="px-4 py-2 font-mono font-semibold">
                      {b.invoice_number}
                    </td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-100">
                      {b.customer_name || "—"}
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell text-slate-500">
                      {(b.invoice_date || b.created_at || "").slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">
                      {money(b.total)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums hidden sm:table-cell text-emerald-700 dark:text-emerald-400">
                      {money(b.paid_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                      {money(b.balance_due)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/billing/invoices/${b.id}/view`)}
                        title="View"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        data-testid={`purchase-bill-view-${b.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/billing/invoices/${b.id}/edit`)}
                        title="Edit"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        data-testid={`purchase-bill-edit-${b.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/billing/invoices/${b.id}/view?print=1`)}
                        title="Print / PDF"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(b.id)}
                        title="Delete"
                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-rose-600"
                        data-testid={`purchase-bill-delete-${b.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
