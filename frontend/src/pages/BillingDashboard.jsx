import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MoneyValue } from "@/context/PrivacyContext";
import { Button } from "@/components/ui/button";
import {
  Receipt, TrendingUp, AlertTriangle, FileText, Package, Users, Plus,
  ShoppingCart, ArrowRight, Clock, IndianRupee,
} from "lucide-react";

export default function BillingDashboard() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [data, setData] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    http.get("/billing/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="p-6 text-[#78716C]">Loading...</div>;

  const cards = [
    { label: "Aaj ki Sale", value: data.today_sales?.total || 0, sub: `${data.today_sales?.count || 0} invoices`, icon: TrendingUp, color: "from-[#3B6446] to-[#2C4C33]", to: "/billing/invoices" },
    { label: "Iss Maheena", value: data.month_sales?.total || 0, sub: `${data.month_sales?.count || 0} invoices`, icon: Receipt, color: "from-[#2A4F4F] to-[#1F3939]", to: "/billing/invoices" },
    { label: "Pending", value: data.pending?.total || 0, sub: `${data.pending?.count || 0} due`, icon: Clock, color: "from-[#E8B365] to-[#B8763A]", to: "/billing/invoices" },
    { label: "Kam Stock", value: data.low_stock_items?.length || 0, sub: "items", icon: AlertTriangle, color: "from-[#D96C52] to-[#B15039]", to: "/billing/products", isCount: true },
  ];

  return (
    <div className="space-y-6" data-testid="billing-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Receipt className="w-7 h-7 text-[#2A4F4F]" /> Billing Dashboard
          </h1>
          <p className="text-[#78716C] mt-1">Aapka business, ek dashboard mein</p>
        </div>
        <Button onClick={() => nav("/billing/invoices/new")} data-testid="new-invoice-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
          <Plus className="w-4 h-4 mr-1" /> Naya Invoice
        </Button>
      </div>

      {/* Quick create buttons for all doc types */}
      <div className="flex flex-wrap gap-2" data-testid="doc-type-shortcuts">
        {[
          { type: "tax", label: "Tax Invoice" },
          { type: "gst", label: "GST Invoice" },
          { type: "proforma", label: "Proforma" },
          { type: "quotation", label: "Quotation" },
          { type: "challan", label: "Delivery Challan" },
          { type: "credit", label: "Credit Note", accent: true },
          { type: "debit", label: "Debit Note", accent: true },
        ].map((d) => (
          <button key={d.type}
            onClick={() => nav(`/billing/invoices/new?type=${d.type}`)}
            data-testid={`quick-${d.type}-btn`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              d.accent
                ? "bg-[#B8763A] text-white border-[#B8763A] hover:bg-[#996322]"
                : "bg-white text-[#57534E] border-[#E7E5DF] hover:bg-[#F2F0EA]"
            }`}
          >
            + {d.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} data-testid={`billing-card-${c.label.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => nav(c.to)}
              className={`bg-gradient-to-br ${c.color} text-white rounded-xl p-4 md:p-5 text-left hover:scale-[1.02] transition-transform`}>
              <div className="flex items-start justify-between">
                <Icon className="w-5 h-5 opacity-90" />
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
              <div className="text-xs uppercase tracking-wider opacity-80 mt-3">{c.label}</div>
              <div className="font-heading text-2xl md:text-3xl font-bold mt-1">
                {c.isCount ? c.value : <MoneyValue>{formatMoney(c.value, cur)}</MoneyValue>}
              </div>
              <div className="text-xs opacity-80 mt-0.5">{c.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4">
          <button className="w-full text-left" onClick={() => nav("/billing/products")}>
            <Package className="w-5 h-5 text-[#2A4F4F]" />
            <div className="mt-2 text-xs uppercase text-[#78716C]">Products</div>
            <div className="font-heading text-2xl font-bold">{data.total_products}</div>
            <div className="text-xs text-[#78716C]">Manage inventory →</div>
          </button>
        </div>
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4">
          <button className="w-full text-left" onClick={() => nav("/billing/customers")}>
            <Users className="w-5 h-5 text-[#2A4F4F]" />
            <div className="mt-2 text-xs uppercase text-[#78716C]">Customers</div>
            <div className="font-heading text-2xl font-bold">{data.total_customers}</div>
            <div className="text-xs text-[#78716C]">Party list →</div>
          </button>
        </div>
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4">
          <button className="w-full text-left" onClick={() => nav("/billing/suppliers")}>
            <ShoppingCart className="w-5 h-5 text-[#2A4F4F]" />
            <div className="mt-2 text-xs uppercase text-[#78716C]">Suppliers</div>
            <div className="font-heading text-2xl font-bold">-</div>
            <div className="text-xs text-[#78716C]">Purchase parties →</div>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2A4F4F]" /> Recent Invoices
          </h2>
          <button onClick={() => nav("/billing/invoices")} className="text-xs text-[#2A4F4F] hover:underline">See All</button>
        </div>
        {data.recent_invoices?.length ? (
          <div className="divide-y divide-[#E7E5DF]">
            {data.recent_invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-3 flex-wrap"
                data-testid={`recent-inv-${inv.id}`}>
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.invoice_number} · {inv.customer_name || "Walk-in"}</div>
                  <div className="text-xs text-[#78716C]">
                    {new Date(inv.invoice_date).toLocaleDateString("en-IN")} · {inv.invoice_type?.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-bold">
                    <MoneyValue>{formatMoney(inv.total, cur)}</MoneyValue>
                  </div>
                  {inv.balance_due > 0 ? (
                    <div className="text-[10px] text-[#B15039] font-semibold uppercase">Due: {formatMoney(inv.balance_due, cur)}</div>
                  ) : (
                    <div className="text-[10px] text-[#3B6446] font-semibold uppercase">Paid</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[#78716C] py-6 text-center">Koi invoice nahi. "Naya Invoice" dabao 🎯</div>
        )}
      </div>

      {data.low_stock_items?.length > 0 && (
        <div className="bg-[#D96C52]/10 border border-[#D96C52]/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#B15039] font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" /> Kam Stock Alert
          </div>
          <div className="text-sm space-y-1">
            {data.low_stock_items.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-mono">{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
