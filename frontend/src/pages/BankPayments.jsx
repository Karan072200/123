import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Banknote, PlayCircle, Trash2, Plus, ArrowLeft, CheckCircle2, HelpCircle } from "lucide-react";

export default function BankPayments() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    reference: "",
    payer_name: "",
    payer_upi: "",
    payment_mode: "upi",
    payment_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [payments, healthRows] = await Promise.all([
        http.get("/billing/bank-payments").then(r => r.data).catch(() => []),
        http.get("/billing/webhook/health").then(r => r.data).catch(() => []),
      ]);
      setRows(Array.isArray(payments) ? payments : []);
      setHealth(Array.isArray(healthRows) ? healthRows : []);
    } finally {
      setLoading(false);
    }
  };

  const importCsv = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("File 4MB se badi hai");
    setImporting(true);
    try {
      const text = await file.text();
      const { data } = await http.post("/billing/bank-payments/import-csv", text, {
        headers: { "Content-Type": "text/csv" },
      });
      toast.success(`${data.imported} payments imported. Ab Auto Match dabao.`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally { setImporting(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Amount daalo");
    try {
      await http.post("/billing/bank-payments", {
        ...form,
        amount: Number(form.amount),
      });
      toast.success("Payment record saved");
      setForm({ ...form, amount: "", reference: "", payer_name: "", payer_upi: "", notes: "" });
      load();
    } catch { toast.error("Save failed"); }
  };

  const reconcile = async () => {
    setRunning(true);
    try {
      const { data } = await http.post("/billing/reconcile");
      toast.success(`${data.auto_matched} auto-matched · ${data.possible} need review`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Reconcile failed"); }
    finally { setRunning(false); }
  };

  const confirmMatch = async (p) => {
    try {
      const { data } = await http.post(`/billing/bank-payments/${p.id}/confirm`);
      toast.success(`Applied to ${data.invoice_number}`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Confirm failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this bank payment?")) return;
    try {
      await http.delete(`/billing/bank-payments/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const statusBadge = (s) => {
    if (s === "matched") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Matched</span>;
    if (s === "possible") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Needs Review</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Unmatched</span>;
  };

  return (
    <div className="space-y-4" data-testid="bank-payments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => nav("/billing")} className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3 h-3" /> Back to Billing
          </button>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[#2A4F4F]" /> Bank Payments &amp; Reconciliation
          </h1>
          <p className="text-sm text-[#78716C] mt-1">
            UPI payments record karo, phir "Auto Match" click karo — open invoices ki balance auto-clear ho jayegi.
          </p>
        </div>
        <Button
          onClick={reconcile}
          disabled={running}
          data-testid="reconcile-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white"
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          {running ? "Matching…" : "Auto Match"}
        </Button>
      </div>

      {/* Provider health strip */}
      {health.length > 0 && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#2A4F4F]" />
            <h3 className="font-semibold text-sm">Webhook Health</h3>
            <span className="text-[10px] text-[#78716C]">(healthy = seen in last 48 h)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {health.map((h) => {
              const dot = h.count === 0
                ? "bg-slate-300"
                : h.healthy
                  ? "bg-emerald-500"
                  : "bg-rose-500";
              const hint = h.count === 0
                ? "Never received"
                : h.healthy
                  ? `Last ${h.hours_since}h ago`
                  : `Silent for ${h.hours_since}h — check config`;
              return (
                <div key={h.provider} data-testid={`health-${h.provider}`}
                  className="flex items-center gap-2 p-2 border border-[#E7E5DF] rounded-md text-xs">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <div className="min-w-0">
                    <div className="font-semibold capitalize truncate">{h.provider.replace("-", " ")}</div>
                    <div className="text-[10px] text-[#78716C] truncate">{hint} · {h.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSV import strip */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#2A4F4F]" />
            <h3 className="font-semibold text-sm">Bulk Import Bank Statement</h3>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            HDFC / ICICI / Axis CSV drop karo — credit rows auto-import ho jaayenge.
          </p>
        </div>
        <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#2A4F4F] text-[#2A4F4F] hover:bg-[#2A4F4F]/5 cursor-pointer text-xs font-semibold">
          <Upload className="w-3.5 h-3.5" />
          {importing ? "Importing…" : "Upload CSV"}
          <input type="file" accept=".csv,text/csv,text/plain"
            data-testid="csv-import-input"
            onChange={(e) => importCsv(e.target.files?.[0])}
            className="hidden" disabled={importing} />
        </label>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Add Incoming Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              data-testid="bp-amount-input" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Reference / UTR</Label>
            <Input value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              data-testid="bp-reference-input"
              placeholder="e.g. INV/2526/0001 or UTR..." />
          </div>
          <div>
            <Label className="text-xs">Payer Name</Label>
            <Input value={form.payer_name}
              onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
              placeholder="Sender name (opt.)" />
          </div>
          <div>
            <Label className="text-xs">Payer UPI ID</Label>
            <Input value={form.payer_upi}
              onChange={(e) => setForm({ ...form, payer_upi: e.target.value })}
              placeholder="name@bank (opt.)" />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <select value={form.payment_mode}
              onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              className="w-full h-9 px-3 border border-[#E7E5DF] rounded-md bg-white text-sm">
              <option value="upi">UPI</option>
              <option value="neft">NEFT</option>
              <option value="imps">IMPS</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={add} data-testid="bp-add-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Payment
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[#E7E5DF] flex items-center gap-2 text-xs text-[#78716C]">
          <HelpCircle className="w-3 h-3" />
          <span>Match score &ge; 60 = auto-applied. 30-59 = manual confirm needed.</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-[#78716C]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#78716C]">
            Koi bank payment record nahi hai. Upar se add karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F8F6] text-[#78716C] text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3 hidden md:table-cell">Payer</th>
                  <th className="text-left p-3">Matched Invoice</th>
                  <th className="text-center p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {rows.map((p) => (
                  <tr key={p.id} data-testid={`bp-row-${p.id}`} className="hover:bg-[#F9F8F6]">
                    <td className="p-3 text-xs">{(p.payment_date || "").slice(0, 10)}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(p.amount, cur)}</td>
                    <td className="p-3 font-mono text-xs">{p.reference || "—"}</td>
                    <td className="p-3 hidden md:table-cell text-xs text-[#57534E]">{p.payer_name || p.payer_upi || "—"}</td>
                    <td className="p-3 font-mono text-xs">
                      {p.matched_invoice_number ? p.matched_invoice_number : <span className="text-[#A8A29E]">—</span>}
                      {p.match_score ? <div className="text-[10px] text-[#78716C]">score {p.match_score}</div> : null}
                    </td>
                    <td className="p-3 text-center">{statusBadge(p.status)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {p.status === "possible" && (
                        <button onClick={() => confirmMatch(p)}
                          data-testid={`bp-confirm-${p.id}`}
                          className="p-1.5 hover:bg-emerald-50 rounded text-emerald-700" title="Confirm match">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => del(p.id)}
                        className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]" title="Delete">
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
