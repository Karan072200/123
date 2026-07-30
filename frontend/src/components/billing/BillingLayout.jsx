import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, ShoppingBag, Users, Truck, 
  CreditCard, BookOpen, BarChart3, Settings, ArrowLeft, ShieldCheck 
} from 'lucide-react';

export default function BillingLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', path: '/billing', icon: LayoutDashboard },
    { label: 'Sales Invoices', path: '/billing/invoices', icon: FileText },
    { label: 'Products & Inventory', path: '/billing/products', icon: ShoppingBag },
    { label: 'Customers', path: '/billing/customers', icon: Users },
    { label: 'Suppliers', path: '/billing/suppliers', icon: Truck },
    { label: 'Payments', path: '/billing/payments', icon: CreditCard },
    { label: 'Ledgers & Day Book', path: '/billing/ledgers', icon: BookOpen },
    { label: 'Reports & GST', path: '/billing/reports', icon: BarChart3 },
    { label: 'Billing Settings', path: '/billing/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      
      {/* 1. PROFESSIONAL BILLING HEADER */}
      <header className="h-16 bg-slate-900 text-white border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>← Back to Apka Munim</span>
          </button>
          
          <div className="flex items-center space-x-2 border-l border-slate-700 pl-6">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white">APKA MUNIM</h1>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Billing & Accounting Workspace</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="hidden sm:flex items-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-400 mr-2">FY:</span>
            <span className="font-bold text-emerald-400">2026-27</span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-emerald-400 font-bold">GST Ready</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PERMANENT PROFESSIONAL SIDEBAR */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Accounting Navigation
          </div>
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive 
                      ? 'bg-emerald-700 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
