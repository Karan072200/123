import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Plus,
  ChevronDown,
  Receipt,
  FileCheck,
  Boxes,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  History,
  ArrowUpDown,
  PieChart,
  ShieldAlert,
  Bot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const tabBase =
  "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors";
const tabIdle =
  "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
const tabActive = "bg-emerald-700 text-white shadow-sm";

function Tab({ to, end, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </NavLink>
  );
}

function isGroupActive(pathAndSearch, prefixes) {
  return prefixes.some((p) => pathAndSearch === p || pathAndSearch.startsWith(p + "/") || pathAndSearch.startsWith(p + "?"));
}

export default function BillingSubNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pas = location.pathname + location.search;

  const salesActive = isGroupActive(pas, [
    "/billing/invoices",
    "/billing/quotations",
    "/billing/proforma",
    "/billing/challans",
    "/billing/sales-orders",
    "/billing/credit-notes",
  ]);
  const purchaseActive = isGroupActive(pas, [
    "/billing/purchase-orders",
    "/billing/debit-notes",
  ]);
  const inventoryActive = isGroupActive(pas, [
    "/billing/inventory",
    "/products",
    "/inventory",
  ]);
  const expenseActive = isGroupActive(pas, [
    "/transactions",
    "/recurring",
  ]);
  const reportsActive = isGroupActive(pas, [
    "/billing/reports",
    "/reports",
    "/reports-ai",
  ]);

  const go = (path) => navigate(path);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-2 py-1.5">
        <Tab to="/billing" end icon={LayoutDashboard} label="Overview" />

        {/* SALES */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${tabBase} ${salesActive ? tabActive : tabIdle} focus:outline-none`}>
            <FileText className="w-3.5 h-3.5" />
            <span>Sales</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuLabel>Sales Documents</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/invoices")}>Sales Invoices</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/quotations")}>Quotations</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/proforma")}>Proforma Invoices</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/challans")}>Delivery Challans</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/sales-orders")}>Sales Orders</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/credit-notes")}>Credit Notes</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("/billing/recurring-invoices")}>Recurring Invoices</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* PURCHASE */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${tabBase} ${purchaseActive ? tabActive : tabIdle} focus:outline-none`}>
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Purchase</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuLabel>Purchase Documents</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/purchase-orders")}>Purchase Orders</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/debit-notes")}>Debit Notes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tab to="/billing/parties" icon={Users} label="Parties" />

        {/* INVENTORY dropdown (includes Products, Stock, Low Stock, etc.) */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${tabBase} ${inventoryActive ? tabActive : tabIdle} focus:outline-none`}>
            <Package className="w-3.5 h-3.5" />
            <span>Inventory</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuLabel>Products &amp; Inventory</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/products")}>Products &amp; Services</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/inventory")}>Billing Inventory</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/inventory")}>Inventory / Stock</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/inventory?filter=low-stock")}>Low Stock Alerts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("/inventory?tab=adjustment")}>Stock Adjustment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/inventory?tab=history")}>Stock History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tab to="/billing/outstanding" icon={Receipt} label="Outstanding" />
        <Tab to="/billing/ledgers" icon={FileCheck} label="Ledgers" />
        <Tab to="/billing/payments" icon={CreditCard} label="Payments" />

        {/* EXPENSES & INCOME dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${tabBase} ${expenseActive ? tabActive : tabIdle} focus:outline-none`}>
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Expenses &amp; Income</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuLabel>Day-to-day Money</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/transactions?type=expense")}>Daily Expenses</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/transactions?type=income")}>Other Income</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/recurring")}>Recurring Payments</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* REPORTS dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${tabBase} ${reportsActive ? tabActive : tabIdle} focus:outline-none`}>
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Reports</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs w-56">
            <DropdownMenuLabel>Sales</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=sales")}>Sales Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=sales-outstanding")}>Sales Outstanding</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=sales-product")}>Sales Product Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=sales-payment")}>Sales Payment Report</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Purchase</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=purchase")}>Purchase Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=purchase-outstanding")}>Purchase Outstanding</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=purchase-product")}>Purchase Product Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=purchase-payment")}>Purchase Payment Report</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Accounting</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=pnl")}>
              <PieChart className="w-3 h-3 mr-2 opacity-70" /> Profit &amp; Loss
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=daybook")}>Day Book</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=customer-ledger")}>Customer Ledger</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=supplier-ledger")}>Supplier Ledger</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=stock")}>Stock Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/reports?type=gst")}>
              <ShieldAlert className="w-3 h-3 mr-2 opacity-70" /> GST Summary
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Overall</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/reports-ai")}>
              <Bot className="w-3 h-3 mr-2 opacity-70" /> Sales &amp; Billing (AI) Reports
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/reports")}>Business Reports</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* + Create */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm focus:outline-none" data-testid="billing-create-menu">
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
            <ChevronDown className="w-3 h-3 opacity-90" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-56">
            <DropdownMenuLabel>Sales</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=tax")}>Sale Invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=gst")}>GST Invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=quotation")}>Quotation</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=proforma")}>Proforma Invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=challan")}>Delivery Challan</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=sales-order")}>Sale Order</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=credit")}>Credit Note</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Purchase</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=purchase-order")}>Purchase Order</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/invoices/new?type=debit")}>Debit Note</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Money</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => go("/billing/payments?type=received")}>Receive Payment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/billing/payments?type=made")}>Make Payment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/transactions?type=expense")}>
              <TrendingDown className="w-3 h-3 mr-2 opacity-70" /> Add Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/transactions?type=income")}>
              <TrendingUp className="w-3 h-3 mr-2 opacity-70" /> Add Income
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/recurring")}>
              <RotateCcw className="w-3 h-3 mr-2 opacity-70" /> Recurring Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
