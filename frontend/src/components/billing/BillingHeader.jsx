import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Plus,
  Calendar,
  Search,
  User,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

/**
 * Top bar for the standalone Billing workspace.
 * Sits inside <BillingLayout>, next to <BillingSidebar>.
 */
export default function BillingHeader({
  onMobileMenu,
  financialYear,
  setFinancialYear,
}) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-slate-200 px-3 sm:px-5 h-14 flex items-center justify-between gap-3 shadow-sm text-xs"
      data-testid="billing-header"
    >
      {/* LEFT: mobile menu + brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMobileMenu}
          className="md:hidden p-1.5 rounded text-slate-300 hover:bg-slate-800"
          aria-label="Open sidebar"
          data-testid="billing-mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md font-semibold border border-slate-700 transition-colors"
          title="Return to Personal Workspace"
          data-testid="billing-back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Personal</span>
        </button>
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
          <span className="font-bold text-white tracking-wide">
            ERP · Billing Workspace
          </span>
        </div>
      </div>

      {/* CENTER: Create dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow focus:outline-none"
          data-testid="billing-header-create-menu"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="w-64 bg-slate-900 border-slate-700 text-slate-200 text-xs"
        >
          <DropdownMenuLabel className="text-emerald-400">
            Sales
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=tax")}
            data-testid="hdr-create-sale-invoice"
          >
            Sale Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=gst")}
          >
            GST Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=quotation")}
          >
            Quotation
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=proforma")}
          >
            Proforma Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=challan")}
          >
            Delivery Challan
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=sales-order")}
          >
            Sale Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=credit")}
          >
            Credit Note / Sales Return
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-rose-400">
            Purchase
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=purchase")}
          >
            Purchase Bill
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigate("/billing/invoices/new?type=purchase-order")
            }
          >
            Purchase Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/invoices/new?type=debit")}
          >
            Debit Note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-sky-400">
            Money
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigate("/billing/payments?type=received")}
          >
            Receive Payment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/billing/payments?type=made")}
          >
            Make Payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* RIGHT: FY + search + profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 sm:px-2.5 py-1 rounded">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            data-testid="billing-header-fy"
          >
            <option value="2026-27" className="bg-slate-900">
              FY 26-27
            </option>
            <option value="2025-26" className="bg-slate-900">
              FY 25-26
            </option>
            <option value="2024-25" className="bg-slate-900">
              FY 24-25
            </option>
            <option value="2023-24" className="bg-slate-900">
              FY 23-24
            </option>
          </select>
        </div>

        <button
          onClick={() => navigate("/billing/settings")}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
          title="Billing Settings"
          data-testid="billing-header-settings"
        >
          <SettingsAvatar />
        </button>
      </div>
    </header>
  );
}

function SettingsAvatar() {
  return <User className="w-4 h-4" />;
}
