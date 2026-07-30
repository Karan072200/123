import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { usePrivacy } from "../../context/PrivacyContext";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  Download,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Party profile — shows a single customer or supplier's full ledger:
 * personal info, aggregate totals and every invoice / bill against them.
 * "Send Statement" downloads a WhatsApp-ready PDF.
 */
export default function PartyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hidden: privacyOn } = usePrivacy();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const money = (v) => (privacyOn ? "••••••" : formatMoney(v, "INR"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: d } = await http.get(`/billing/parties/${id}/statement`);
        if (!cancelled) setData(d);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Party load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const party = data?.party;
  const invoices = data?.invoices || [];
  const totals = data?.totals || { billed: 0, paid: 0, outstanding: 0, count: 0 };

  const isCustomer = party?.kind === "customer";
  const accent = isCustomer ? "emerald" : "sky";

  const downloadStatement = async () => {
    try {
      const res = await http.get(`/billing/parties/${id}/statement.pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `statement-${(party?.name || "party").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Statement downloaded");
    } catch (e) {
      toast.error("Statement download failed");
    }
  };

  const shareOnWhatsApp = () => {
    if (!party) return;
    const phone = (party.phone || "").replace(/\D/g, "");
    const msg =
      `Namaste ${party.name || ""},\n\n` +
      `Aapke account ka summary:\n` +
      `- Total Billed: ${money(totals.billed)}\n` +
      `- Total Paid: ${money(totals.paid)}\n` +
      `- Outstanding: ${money(totals.outstanding)}\n\n` +
      `Detailed statement PDF request kariye ya humein contact kariye.\n\nDhanyavaad!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500" data-testid="party-profile-loading">
        Loading…
      </div>
    );
  }
  if (!party) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">Party not found</div>
    );
  }

  return (
    <div className="space-y-4" data-testid="party-profile-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            data-testid="party-profile-back-btn"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className={`w-10 h-10 rounded bg-${accent}-50 dark:bg-${accent}-950/40 border border-${accent}-200 dark:border-${accent}-900 flex items-center justify-center text-${accent}-600 dark:text-${accent}-400`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {party.name}
            </h1>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap mt-0.5">
              <span className="uppercase font-semibold">{party.kind}</span>
              {party.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {party.phone}
                </span>
              )}
              {party.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {party.email}
                </span>
              )}
              {party.gstin && (
                <span className="font-mono">GSTIN: {party.gstin}</span>
              )}
            </div>
            {party.address && (
              <div className="text-[11px] text-slate-500 flex items-start gap-1 mt-0.5">
                <MapPin className="w-3 h-3 mt-0.5" />
                <span>{party.address}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={shareOnWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20b358] text-white rounded-md text-xs font-semibold shadow-sm"
            data-testid="party-profile-whatsapp-btn"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={downloadStatement}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-sm"
            data-testid="party-profile-statement-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Statement PDF</span>
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Billed
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {money(totals.billed)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Paid
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {money(totals.paid)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold">
            Outstanding
          </div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1 tabular-nums">
            {money(totals.outstanding)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Documents
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {totals.count}
          </div>
        </div>
      </div>

      {/* Invoices list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Invoices &amp; Bills
          </h3>
          <span className="text-[11px] text-slate-500">{invoices.length} total</span>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Koi invoice / bill nahi. Create karo Sale Invoice ya Purchase Bill.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Doc #</th>
                  <th className="text-left px-4 py-2 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                    Type
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
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => navigate(`/billing/invoices/${inv.id}/view`)}
                    data-testid={`party-profile-invoice-${inv.id}`}
                  >
                    <td className="px-4 py-2 font-mono font-semibold">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {(inv.invoice_date || inv.created_at || "").slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {inv.invoice_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">
                      {money(inv.total)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums hidden sm:table-cell text-emerald-700 dark:text-emerald-400">
                      {money(inv.paid_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                      {money(inv.balance_due)}
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
