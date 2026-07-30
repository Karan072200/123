import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Repeat, PlayCircle, Trash2, Power, ArrowLeft, ChevronRight } from "lucide-react";

export default function RecurringInvoices() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/billing/recurring-invoices");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data } = await http.post("/billing/recurring-invoices/run");
      if (data.count > 0) toast.success(`${data.count} invoice(s) auto-generated`);
      else toast.message("Kuch bhi due nahi hai abhi");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Run failed");
    } finally { setRunning(false); }
  };

  const toggle = async (r) => {
    try {
      await http.patch(`/billing/recurring-invoices/${r.id}`, { enabled: !r.enabled });
      load();
    } catch { toast.error("Update failed"); }
  };

  const del = async (r) => {
    if (!window.confirm(`Delete recurring template for ${r.customer_name || "customer"}?`)) return;
    try {
      await http.delete(`/billing/recurring-invoices/${r.id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const templateTotal = (r) => {
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
    <div className="space-y-4" data-testid="recurring-invoices-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => nav("/billing/invoices")} className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3 h-3" /> Back to Invoices
          </button>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Repeat className="w-6 h-6 text-[#2A4F4F]" /> Recurring Invoices
          </h1>
          <p className="text-sm text-[#78716C] mt-1">
            Retainer clients bill themselves — invoices auto-generate every month.
          </p>
        </div>
        <Button
          onClick={runNow}
          disabled={running}
          data-testid="run-recurring-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white"
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          {running ? "Running…" : "Run Due Now"}
        </Button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-12 text-center text-sm text-[#78716C]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <Repeat className="w-10 h-10 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-sm text-[#78716C] mb-4">Koi recurring invoice template nahi hai.</p>
          <p className="text-xs text-[#A8A29E]">
            Create karo: New Invoice banate waqt "Save as monthly recurring" checkbox tick karo.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F8F6] text-[#78716C] text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3 hidden sm:table-cell">Type</th>
                  <th className="text-left p-3 hidden md:table-cell">Day</th>
                  <th className="text-left p-3 hidden md:table-cell">Next Run</th>
                  <th className="text-right p-3">Approx Total</th>
                  <th className="text-center p-3 hidden sm:table-cell">Generated</th>
                  <th className="text-center p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {rows.map((r) => (
                  <tr key={r.id} data-testid={`recurring-row-${r.id}`} className="hover:bg-[#F9F8F6]">
                    <td className="p-3 font-medium">{r.customer_name || "Walk-in"}</td>
                    <td className="p-3 hidden sm:table-cell text-xs uppercase text-[#57534E]">{r.invoice_type}</td>
                    <td className="p-3 hidden md:table-cell text-[#57534E]">{r.day_of_month} of month</td>
                    <td className="p-3 hidden md:table-cell text-[#57534E]">{r.next_run_date || "—"}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(templateTotal(r), cur)}</td>
                    <td className="p-3 text-center hidden sm:table-cell text-xs text-[#78716C]">{r.generated_count || 0}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.enabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.enabled ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => toggle(r)}
                        data-testid={`recurring-toggle-${r.id}`}
                        className="p-1.5 hover:bg-[#F2F0EA] rounded"
                        title={r.enabled ? "Pause" : "Resume"}
                      >
                        <Power className={`w-3.5 h-3.5 ${r.enabled ? "text-emerald-600" : "text-slate-400"}`} />
                      </button>
                      <button
                        onClick={() => del(r)}
                        className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]"
                        title="Delete"
                      >
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

      <div className="text-xs text-[#78716C] px-1">
        <ChevronRight className="w-3 h-3 inline" /> Tip: "Run Due Now" click karo har month ki pehli tarikh ke baad — sabhi due templates ek click mein bill ho jaayenge.
      </div>
    </div>
  );
}
