import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw, ArrowRight } from "lucide-react";
import Invoices from "../Invoices";

/**
 * Sales Returns page.
 * In the Indian GST model a "sales return" is issued as a Credit Note against
 * an original sale. We reuse the shared Invoices list scoped to type="credit"
 * and add a return-specific header + guidance banner.
 */
export default function SalesReturns() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4" data-testid="sales-returns-page">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Sales Returns
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer returns / refunds — recorded as Credit Notes for GST compliance.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/billing/invoices/new?type=credit")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-sm"
          data-testid="sales-returns-new-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sales Return</span>
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <span className="font-semibold">Tip:</span>
        <span>
          Har sales return original invoice ke reference se banao — GSTR-1 filing
          me sahi credit note number pass hoga.
          <button
            onClick={() => navigate("/billing/invoices")}
            className="ml-1 underline font-semibold inline-flex items-center gap-1"
          >
            View Sales Invoices <ArrowRight className="w-3 h-3" />
          </button>
        </span>
      </div>

      <Invoices type="credit-note" />
    </div>
  );
}
