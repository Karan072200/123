import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, ShoppingBag, Users, Boxes, CreditCard, BarChart2 } from 'lucide-react';

export default function BillingSubNav() {
  const tabs = [
    { label: 'Overview', path: '/billing', icon: LayoutDashboard },
    { label: 'Sales Invoices', path: '/invoices', icon: FileText },
    { label: 'Purchases', path: '/invoices?type=purchase', icon: ShoppingBag },
    { label: 'Parties', path: '/parties', icon: Users },
    { label: 'Stock & Inventory', path: '/inventory', icon: Boxes },
    { label: 'Payments', path: '/udhaar', icon: CreditCard },
    { label: 'Billing Reports', path: '/reports-ai', icon: BarChart2 },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 mb-6 -mt-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
      <div className="flex space-x-6 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/billing'}
              className={({ isActive }) =>
                `flex items-center space-x-2 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
