import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookMarked, Trash2, ArrowLeft, Copy } from "lucide-react";

export default function InvoiceTemplates() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/billing/invoice-templates");
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (r) => {
    if (!window.confirm(`Delete template "${r.name}"?`)) return;
    try {
      await http.delete(`/billing/invoice-templates/${r.id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const applyTemplate = (r) => {
    // Store selected template id in sessionStorage; InvoiceCreate reads it on mount
    sessionStorage.setItem("am_use_template_id", r.id);
    nav("/billing/invoices/new");
  };

  const approxTotal = (r) => {
    let taxable = 0, tax = 0;
    (r.items || []).forEach((it) => {
      const line = Number(it.qty || 0) * Number(it.price || 0);
      const afterDisc = line * (1 - Number(it.discount_pct || 0) / 100);
      const rate = Number(it.gst_rate || 0);
      if (r.gst_mode === "inclusive") {
        const lt = rate ? afterDisc / (1 + rate / 100) : afterDisc;
        taxable += lt; tax += afterDisc - lt;
      } else {
        taxable += afterDisc; tax += afterDisc * (rate / 100);
      }
    });
    return taxable + tax + Number(r.shipping || 0) - Number(r.discount_amount || 0);
  };

  return (
    <div className="space-y-4" data-testid="invoice-templates-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => nav("/billing/invoices")} className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3 h-3" /> Back to Invoices
          </button>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-[#2A4F4F]" /> Invoice Templates
          </h1>
          <p className="text-sm text-[#78716C] mt-1">
            Named presets — quotations aur repeat invoices 10 seconds mein bhej do.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-12 text-center text-sm text-[#78716C]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <BookMarked className="w-10 h-10 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-sm text-[#78716C] mb-4">Koi template save nahi hai.</p>
          <p className="text-xs text-[#A8A29E]">
            New Invoice banate waqt items add karke "Save as Template" click karo.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F8F6] text-[#78716C] text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Template Name</th>
                  <th className="text-left p-3 hidden sm:table-cell">Type</th>
                  <th className="text-center p-3 hidden md:table-cell">Items</th>
                  <th className="text-right p-3">Approx Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {rows.map((r) => (
                  <tr key={r.id} data-testid={`template-row-${r.id}`} className="hover:bg-[#F9F8F6]">
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 hidden sm:table-cell text-xs uppercase text-[#57534E]">{r.invoice_type}</td>
                    <td className="p-3 hidden md:table-cell text-center text-xs text-[#78716C]">{(r.items || []).length}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(approxTotal(r), cur)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => applyTemplate(r)}
                        data-testid={`template-use-${r.id}`}
                        className="p-1.5 hover:bg-emerald-50 rounded text-emerald-700" title="Use">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(r)}
                        className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
