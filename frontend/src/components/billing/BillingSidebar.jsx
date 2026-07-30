import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Users,
  Package,
  CreditCard,
  BookOpen,
  BarChart3,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Boxes,
  Receipt,
  ScrollText,
  RotateCcw,
  ArrowLeftRight,
  ShieldAlert,
  Bot,
  X,
} from "lucide-react";

/**
 * ERP-style vertical sidebar for the Billing workspace.
 * Sections are collapsible; the active route stays highlighted.
 * On mobile it renders as a slide-in drawer controlled by `open` / `onClose`.
 */

const sections = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/billing",
    end: true,
  },
  {
    key: "sales",
    label: "Sales",
    icon: FileText,
    children: [
      { label: "Sales Invoices", to: "/billing/invoices" },
      { label: "Quotations", to: "/billing/quotations" },
      { label: "Proforma Invoices", to: "/billing/proforma" },
      { label: "Delivery Challans", to: "/billing/challans" },
      { label: "Sales Orders", to: "/billing/sales-orders" },
      { label: "Credit Notes", to: "/billing/credit-notes" },
      { label: "Sales Returns", to: "/billing/sales-returns" },
      { label: "Recurring Invoices", to: "/billing/recurring-invoices" },
      { label: "Invoice Templates", to: "/billing/invoice-templates" },
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    icon: ShoppingBag,
    children: [
      { label: "Purchase Bills", to: "/billing/purchase-bills" },
      { label: "Purchase Orders", to: "/billing/purchase-orders" },
      { label: "Debit Notes", to: "/billing/debit-notes" },
    ],
  },
  {
    key: "parties",
    label: "Parties",
    icon: Users,
    children: [
      { label: "All Parties", to: "/billing/parties" },
      { label: "Customers", to: "/customers" },
      { label: "Suppliers", to: "/suppliers" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Products & Services", to: "/billing/inventory" },
      { label: "Stock Adjustments", to: "/billing/inventory-adjustments" },
      { label: "Low Stock Alerts", to: "/billing/inventory?filter=low-stock" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    icon: CreditCard,
    children: [
      { label: "Outstanding", to: "/billing/outstanding" },
      { label: "Received / Made", to: "/billing/payments" },
      { label: "Bank Match", to: "/billing/bank-payments" },
    ],
  },
  {
    key: "ledgers",
    label: "Ledgers",
    icon: BookOpen,
    children: [
      { label: "Customer Ledger", to: "/billing/customer-ledger" },
      { label: "Supplier Ledger", to: "/billing/supplier-ledger" },
      { label: "All Ledgers", to: "/billing/ledgers" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Sales Report", to: "/billing/reports?type=sales" },
      { label: "Purchase Report", to: "/billing/reports?type=purchase" },
      { label: "GST Summary", to: "/billing/reports?type=gst" },
      { label: "Profit & Loss", to: "/billing/reports?type=pnl" },
      { label: "Day Book", to: "/billing/reports?type=daybook" },
      { label: "Stock Report", to: "/billing/reports?type=stock" },
      { label: "AI Reports", to: "/reports-ai" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsIcon,
    to: "/billing/settings",
  },
];

function isPathActive(currentPas, target) {
  if (!target) return false;
  const [tPath, tQs] = target.split("?");
  const [cPath, cQs] = currentPas.split("?");
  if (cPath !== tPath && !cPath.startsWith(tPath + "/")) return false;
  if (!tQs) return true;
  return (cQs || "").includes(tQs);
}

function sectionHasActiveChild(section, pas) {
  if (!section.children) return false;
  return section.children.some((c) => isPathActive(pas, c.to));
}

export default function BillingSidebar({ open = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pas = location.pathname + location.search;

  // Auto-expand the section whose child is currently active
  const initialExpanded = React.useMemo(() => {
    const m = {};
    for (const s of sections) {
      if (s.children && sectionHasActiveChild(s, pas)) m[s.key] = true;
    }
    // Also open Sales by default on the base overview
    if (Object.keys(m).length === 0) m.sales = true;
    return m;
  }, [pas]);

  const [expanded, setExpanded] = useState(initialExpanded);
  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const go = (to) => {
    navigate(to);
    if (onClose) onClose();
  };

  const content = (
    <aside
      className="w-60 shrink-0 h-full bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col"
      data-testid="billing-sidebar"
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img
            src="/apkamunim-playstore-icon-512.png"
            alt="Apka Munim"
            className="w-7 h-7 rounded"
          />
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
              Billing
            </div>
            <div className="text-xs font-semibold text-slate-100">
              Apka Munim ERP
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded text-slate-400 hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-xs">
        {sections.map((s) => {
          if (!s.children) {
            const active = isPathActive(pas, s.to) || (s.end && pas === s.to);
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => go(s.to)}
                data-testid={`billing-nav-${s.key}`}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-semibold transition-colors ${
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{s.label}</span>
              </button>
            );
          }

          const groupActive = sectionHasActiveChild(s, pas);
          const isOpen = expanded[s.key] || groupActive;
          const Icon = s.icon;

          return (
            <div key={s.key} className="select-none">
              <button
                onClick={() => toggle(s.key)}
                data-testid={`billing-nav-${s.key}`}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-semibold transition-colors ${
                  groupActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{s.label}</span>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>
              {isOpen && (
                <div className="mt-0.5 mb-1 ml-4 border-l border-slate-800 pl-2 space-y-0.5">
                  {s.children.map((c) => {
                    const active = isPathActive(pas, c.to);
                    return (
                      <button
                        key={c.to + c.label}
                        onClick={() => go(c.to)}
                        data-testid={`billing-nav-${s.key}-${c.label
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}`}
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors ${
                          active
                            ? "bg-emerald-950/60 text-emerald-300 font-semibold"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3 space-y-2 text-[11px]">
        <button
          onClick={() => go("/dashboard")}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md font-semibold"
          data-testid="billing-back-to-personal"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Back to Personal</span>
        </button>
        <div className="text-center text-slate-500">v2.0 · ERP Workspace</div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex md:sticky md:top-0 md:h-screen">
        {content}
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
}
