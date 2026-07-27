import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MoneyValue } from "@/context/PrivacyContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Eye, Printer, Copy, Edit3 } from "lucide-react";
import DateFilter, { computeRange } from "@/components/DateFilter";

export default function Invoices() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [items, setItems] = useState([]);
  const [datePreset, setDatePreset] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const nav = useNavigate();

  const load = async () => { const { data } = await http.get("/billing/invoices"); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const filtered = React.useMemo(() => {
    const range = computeRange(datePreset);
    return (items || []).filter((inv) => {
      if (typeFilter !== "all" && inv.invoice_type !== typeFilter) return false;
      if (range.from) {
        const d = new Date(inv.invoice_date).getTime();
        if (d < new Date(range.from).getTime() || d > new Date(range.to).getTime()) return false;
      }
      return true;
    });
  }, [items, datePreset, typeFilter]);

  const remove = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    await http.delete(`/billing/invoices/${id}`);
    toast.success("Deleted");
    load();
  };

  const printInv = (id) => nav(`/billing/invoices/${id}/view?print=1`);
  const view = (id) => nav(`/billing/invoices/${id}/view`);

  return (
    <div className="space-y-4" data-testid="invoices-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#2A4F4F]" /> Invoices
          </h1>
          <p className="text-[#78716C] mt-1">Sab bills ek jagah</p>
        </div>
        <Button onClick={() => nav("/billing/invoices/new")} data-testid="create-invoice-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
          <Plus className="w-4 h-4 mr-1" /> Naya Invoice
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DateFilter value={datePreset} onChange={setDatePreset} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          data-testid="invoice-type-filter"
          className="h-8 px-3 rounded-full text-xs border border-[#E7E5DF] bg-white">
          <option value="all">Sab Type</option>
          <option value="tax">Tax Invoice</option>
          <option value="gst">GST Invoice</option>
          <option value="proforma">Proforma</option>
          <option value="quotation">Quotation</option>
          <option value="challan">Delivery Challan</option>
          <option value="credit">Credit Note</option>
          <option value="debit">Debit Note</option>
        </select>
        <span className="text-xs text-[#78716C]">Showing {filtered.length} / {items.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#78716C]">Koi invoice nahi. Naya banao.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F8F6] text-[#78716C] text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Invoice #</th>
                  <th className="text-left p-3 hidden sm:table-cell">Customer</th>
                  <th className="text-left p-3 hidden md:table-cell">Date</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3 hidden sm:table-cell">Due</th>
                  <th className="text-center p-3 hidden md:table-cell">Type</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {filtered.map((inv) => (
                  <tr key={inv.id} data-testid={`invoice-${inv.id}`} className="hover:bg-[#F9F8F6]">
                    <td className="p-3 font-mono font-medium">{inv.invoice_number}</td>
                    <td className="p-3 hidden sm:table-cell">{inv.customer_name || "Walk-in"}</td>
                    <td className="p-3 hidden md:table-cell text-xs text-[#78716C]">{new Date(inv.invoice_date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 text-right font-semibold"><MoneyValue>{formatMoney(inv.total, cur)}</MoneyValue></td>
                    <td className="p-3 text-right hidden sm:table-cell">
                      {inv.balance_due > 0 ? (
                        <span className="text-[#B15039] font-semibold"><MoneyValue>{formatMoney(inv.balance_due, cur)}</MoneyValue></span>
                      ) : (
                        <span className="text-[#3B6446] text-xs uppercase">Paid</span>
                      )}
                    </td>
                    <td className="p-3 text-center hidden md:table-cell">
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#F2F0EA]">{inv.invoice_type}</span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => view(inv.id)} data-testid={`view-inv-${inv.id}`} className="p-1.5 hover:bg-[#F2F0EA] rounded" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => nav(`/billing/invoices/${inv.id}/edit`)} data-testid={`edit-inv-${inv.id}`} className="p-1.5 hover:bg-[#F2F0EA] rounded" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => printInv(inv.id)} className="p-1.5 hover:bg-[#F2F0EA] rounded" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(inv.id)} className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
