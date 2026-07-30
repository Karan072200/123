import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * OverdueDigestCard — shows a live count of overdue invoices on the Dashboard.
 * Hidden when there is nothing overdue (green path = no clutter).
 */
export default function OverdueDigestCard() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [state, setState] = useState({ loading: true, count: 0, total: 0, rows: [] });
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [invRes, cusRes] = await Promise.all([
          http.get("/billing/invoices").catch(() => ({ data: [] })),
          http.get("/billing/customers").catch(() => ({ data: [] })),
        ]);
        const invoices = Array.isArray(invRes.data) ? invRes.data : [];
        const customers = Array.isArray(cusRes.data) ? cusRes.data : [];
        const today = new Date().toISOString().slice(0, 10);
        const overdue = invoices
          .filter((i) => (i.due_date || "") && String(i.due_date).slice(0, 10) < today && Number(i.balance_due || 0) > 0)
          .map((i) => {
            const c = customers.find((c) => c.id === i.customer_id);
            return {
              id: i.id,
              invoice_number: i.invoice_number,
              customer_name: i.customer_name || "Walk-in",
              customer_phone: c?.phone,
              balance_due: Number(i.balance_due || 0),
              due_date: i.due_date,
              days_overdue: Math.max(
                0,
                Math.round((Date.now() - new Date(i.due_date).getTime()) / 86_400_000)
              ),
            };
          })
          .sort((a, b) => b.days_overdue - a.days_overdue);
        if (!cancelled) {
          setState({
            loading: false,
            count: overdue.length,
            total: overdue.reduce((s, r) => s + r.balance_due, 0),
            rows: overdue.slice(0, 3),
          });
        }
      } catch {
        if (!cancelled) setState({ loading: false, count: 0, total: 0, rows: [] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading || state.count === 0) return null;

  const sendDigest = async () => {
    try {
      const { data } = await http.post("/billing/overdue-digest/send");
      toast.success(`Digest emailed to ${data.recipient}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Digest send failed");
    }
  };

  const remindAll = () => {
    const withPhone = state.rows.filter((r) => r.customer_phone);
    if (!withPhone.length) return toast.error("Recent overdue rows have no phone numbers");
    withPhone.forEach((r, i) => {
      setTimeout(() => {
        const msg = `Namaste ${r.customer_name}, aapka invoice ${r.invoice_number} ${r.days_overdue} din se pending hai. Kripya settle karo. — Apka Munim`;
        window.open(`https://wa.me/${r.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
      }, i * 400);
    });
  };

  return (
    <div
      data-testid="overdue-digest-card"
      className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4 md:p-5 mb-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-300">
              Overdue Invoices
            </div>
            <div className="font-heading text-xl md:text-2xl font-bold text-rose-800 dark:text-rose-200 leading-tight">
              {state.count} invoice{state.count === 1 ? "" : "s"} · {formatMoney(state.total, cur)}
            </div>
            <div className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
              Chase these customers to unlock cash flow.
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={remindAll}
            data-testid="digest-card-whatsapp"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#25D366] hover:bg-[#1DA851] text-white"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Top 3 WhatsApp
          </button>
          <button
            onClick={sendDigest}
            data-testid="digest-card-email"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950"
          >
            <Mail className="w-3.5 h-3.5" /> Email Digest
          </button>
          <button
            onClick={() => nav("/billing/invoices")}
            data-testid="digest-card-view"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-700 hover:bg-rose-800 text-white"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {state.rows.length > 0 && (
        <div className="mt-3 divide-y divide-rose-200 dark:divide-rose-900 border-t border-rose-200 dark:border-rose-900">
          {state.rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 text-xs">
              <div className="min-w-0">
                <div className="font-mono font-semibold text-rose-900 dark:text-rose-100 truncate">{r.invoice_number}</div>
                <div className="text-rose-700 dark:text-rose-300 truncate">{r.customer_name}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-bold text-rose-900 dark:text-rose-100 tabular-nums">
                  {formatMoney(r.balance_due, cur)}
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-300">{r.days_overdue} days late</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
