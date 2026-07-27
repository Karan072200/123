import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, TrendingUp, TrendingDown, ArrowLeftRight, Users, FileText, ShoppingCart, Package } from "lucide-react";

const ITEMS = [
  { label: "Income", icon: TrendingUp, to: "/transactions?add=1&type=income", color: "bg-[#3B6446]" },
  { label: "Expense", icon: TrendingDown, to: "/transactions?add=1&type=expense", color: "bg-[#B15039]" },
  { label: "Transfer", icon: ArrowLeftRight, to: "/accounts?transfer=1", color: "bg-[#2A4F4F]" },
  { label: "Udhaar", icon: Users, to: "/udhaar?add=1", color: "bg-[#B8763A]" },
  { label: "Invoice", icon: FileText, to: "/billing/invoices/new", color: "bg-[#1F3B3B]" },
  { label: "Purchase", icon: ShoppingCart, to: "/billing/purchases?add=1", color: "bg-[#57534E]" },
  { label: "Product", icon: Package, to: "/billing/products?add=1", color: "bg-[#4A7C59]" },
];

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (to) => { setOpen(false); nav(to); };

  return (
    <div ref={ref} className="fixed bottom-24 right-5 z-40 md:bottom-6" data-testid="quick-add-fab">
      {open && (
        <div className="mb-3 flex flex-col-reverse gap-2 items-end">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                onClick={() => go(it.to)}
                data-testid={`fab-${it.label.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-white shadow-lg ${it.color} hover:scale-105 transition-transform animate-in slide-in-from-bottom-2`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="quick-add-fab-btn"
        className="w-14 h-14 rounded-full bg-[#2A4F4F] hover:bg-[#1F3939] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Quick Add"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
