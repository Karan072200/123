import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Search, User, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export default function BillingHeader({ financialYear, setFinancialYear }) {
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm text-xs">
      {/* LEFT: Logo & Return to Main App */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md font-semibold transition-colors border border-slate-700"
          title="Return to Main Apka Munim Workspace"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Apka Munim</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />
        <div className="flex items-center space-x-2">
          <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-6 h-6 rounded" />
          <span className="font-bold text-white tracking-wide">APKA MUNIM BILLING</span>
        </div>
      </div>

      {/* CENTER: Prominent + CREATE Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow focus:outline-none">
          <Plus className="w-4 h-4" />
          <span>+ Create</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56 bg-slate-900 border-slate-700 text-slate-200 text-xs p-2 grid grid-cols-2 gap-1.5">
          <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Sales Documents</div>
          <button onClick={() => navigate('/billing/invoices/create?type=sale')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Sale Invoice</button>
          <button onClick={() => navigate('/billing/quotations/create')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Quotation</button>
          <button onClick={() => navigate('/billing/proforma/create')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Proforma</button>
          <button onClick={() => navigate('/billing/challans/create')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Challan</button>

          <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1.5 border-t border-slate-800">Purchase Documents</div>
          <button onClick={() => navigate('/billing/invoices/create?type=purchase')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Purchase Bill</button>
          <button onClick={() => navigate('/billing/purchase-orders/create')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-left font-medium">Purchase Order</button>

          <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1.5 border-t border-slate-800">Payments</div>
          <button onClick={() => navigate('/billing/payments/create?type=received')} className="p-2 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 rounded text-left font-medium">Inward Payment</button>
          <button onClick={() => navigate('/billing/payments/create?type=made')} className="p-2 bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 rounded text-left font-medium">Outward Payment</button>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* RIGHT: Financial Year Dropdown */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="2026-27" className="bg-slate-900">F.Y. 2026-2027</option>
            <option value="2025-26" className="bg-slate-900">F.Y. 2025-2026</option>
            <option value="2024-25" className="bg-slate-900">F.Y. 2024-2025</option>
            <option value="2023-24" className="bg-slate-900">F.Y. 2023-2024</option>
          </select>
        </div>

        <button
          onClick={() => navigate('/billing/settings')}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
          title="Billing Settings"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
