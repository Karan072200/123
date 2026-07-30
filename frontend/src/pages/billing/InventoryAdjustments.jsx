import React, { useEffect, useMemo, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { usePrivacy } from "../../context/PrivacyContext";
import { Boxes, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

/**
 * Inventory Adjustments — shows current stock, low-stock alerts and
 * out-of-stock counts. Adjustments are recorded via the Products page
 * (edit product → change stock), we surface the current inventory picture here.
 */
export default function InventoryAdjustments() {
  const { hidden: privacyOn } = usePrivacy();
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const money = (v) => (privacyOn ? "••••••" : formatMoney(v, "INR"));

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/billing/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Inventory load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    let r = products.map((p) => {
      const stock = Number(p.stock ?? 0);
      const low = Number(p.low_stock_alert ?? 0);
      const rate = Number(p.purchase_price ?? p.price ?? 0);
      const status =
        stock === 0 ? "out" : stock <= low ? "low" : "ok";
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        stock,
        low,
        value: stock * rate,
        status,
      };
    });
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      r = r.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(needle) ||
          (p.sku || "").toLowerCase().includes(needle)
      );
    }
    // sort: out first, low next, then ok
    const rank = { out: 0, low: 1, ok: 2 };
    r.sort((a, b) => rank[a.status] - rank[b.status]);
    return r;
  }, [products, q]);

  const summary = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    for (const p of rows) {
      value += p.value;
      if (p.status === "low") low += 1;
      if (p.status === "out") out += 1;
    }
    return { value, low, out, total: rows.length };
  }, [rows]);

  const badge = (status) => {
    if (status === "out")
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          Out of stock
        </span>
      );
    if (status === "low")
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Low
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        OK
      </span>
    );
  };

  return (
    <div className="space-y-4" data-testid="inventory-adjustments-page">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Inventory Adjustments
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Current stock levels, low-stock alerts aur inventory valuation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Products
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {summary.total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Stock Value
          </div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            {money(summary.value)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Low Stock
          </div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">
            {summary.low}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-lg p-3 bg-rose-50/40 dark:bg-rose-950/20">
          <div className="text-[10px] uppercase tracking-wider text-rose-800 dark:text-rose-400 font-semibold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Out of Stock
          </div>
          <div className="text-lg font-bold text-rose-800 dark:text-rose-300 mt-1">
            {summary.out}
          </div>
        </div>
      </div>

      <input
        placeholder="Search product / SKU"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        data-testid="inventory-adjustments-search"
        className="px-3 py-2 w-full max-w-md text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Koi product nahi mila.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Product</th>
                  <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">
                    SKU
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Stock</th>
                  <th className="text-right px-4 py-2 font-semibold hidden md:table-cell">
                    Low Alert
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Value</th>
                  <th className="px-4 py-2 font-semibold text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    data-testid={`inventory-adj-row-${r.id}`}
                  >
                    <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-slate-500 hidden sm:table-cell">
                      {r.sku || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">
                      {r.stock}{" "}
                      <span className="text-slate-400 text-[10px]">
                        {r.unit || ""}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500 hidden md:table-cell">
                      {r.low}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {money(r.value)}
                    </td>
                    <td className="px-4 py-2">{badge(r.status)}</td>
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
