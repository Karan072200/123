import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingBag,
  CreditCard,
  TrendingDown,
  FileCheck,
  BarChart3,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function BillingSubNav() {
  const location = useLocation();

  return (
    <div className="bg-[#2A4F4F] text-white text-xs border-b border-emerald-950 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-4 overflow-x-auto scrollbar-none py-1.5">
        
        {/* Dashboard */}
        <NavLink
          to="/billing"
          end
          className={({ isActive }) =>
            `flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              isActive ? "bg-emerald-800 text-white shadow" : "text-emerald-100 hover:bg-emerald-800/60"
            }`
          }
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </NavLink>

        {/* Customer / Vendor */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <Users className="w-3.5 h-3.5" />
            <span>Customer / Vendor</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild>
              <NavLink to="/billing/parties?type=customer">Customers & Vendors</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing/parties?tab=groups">Customer Groups</NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Products / Services */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <Package className="w-3.5 h-3.5" />
            <span>Products / Inventory</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild>
              <NavLink to="/billing/inventory">All Products & Services</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing/inventory?filter=low-stock">Low Stock Report</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing/inventory?tab=barcodes">Barcode Generator</NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sale Invoice */}
        <NavLink
          to="/billing/invoices?type=sale"
          className={({ isActive }) =>
            `flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              isActive ? "bg-emerald-800 text-white shadow" : "text-emerald-100 hover:bg-emerald-800/60"
            }`
          }
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Sale Invoice</span>
        </NavLink>

        {/* Purchase Invoice */}
        <NavLink
          to="/billing/invoices?type=purchase"
          className={({ isActive }) =>
            `flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              isActive ? "bg-emerald-800 text-white shadow" : "text-emerald-100 hover:bg-emerald-800/60"
            }`
          }
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Purchase Invoice</span>
        </NavLink>

        {/* Payment */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild>
              <NavLink to="/billing/payments?type=received">Inward Payment (Sales)</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing/payments?type=made">Outward Payment (Purchase)</NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Expense / Income */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Expense / Income</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild>
              <NavLink to="/billing/expenses">Daily Expenses</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing/income">Other Income</NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Other Documents */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Other Documents</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild><NavLink to="/billing/quotations">Quotation</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/proforma">Proforma Invoice</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/challans">Delivery Challan</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/sales-orders">Sale Order</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/purchase-orders">Purchase Order</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/credit-notes">Credit Note</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/debit-notes">Debit Note</NavLink></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reports & GST */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1.5 text-emerald-100 hover:bg-emerald-800/60 rounded font-semibold focus:outline-none">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>GST & Reports</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900 text-slate-200 border-slate-700 text-xs">
            <DropdownMenuItem asChild><NavLink to="/billing/reports?type=sales">Sales Report</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/reports?type=purchase">Purchase Report</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/reports?type=gst">GSTR-1 / GSTR-3B Summary</NavLink></DropdownMenuItem>
            <DropdownMenuItem asChild><NavLink to="/billing/reports?type=pnl">Profit & Loss Report</NavLink></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </div>
  );
}
