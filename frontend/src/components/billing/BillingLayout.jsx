import React, { useState } from "react";
import BillingSidebar from "./BillingSidebar";
import BillingHeader from "./BillingHeader";

/**
 * Standalone ERP-style Billing workspace shell.
 * Owns its own sidebar + top header — does NOT sit inside the main personal
 * app Layout. A "Back to Personal" button on the sidebar returns the user
 * to the main Apka Munim workspace.
 */
export default function BillingLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [financialYear, setFinancialYear] = useState("2025-26");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      <BillingSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <BillingHeader
          onMobileMenu={() => setMobileOpen(true)}
          financialYear={financialYear}
          setFinancialYear={setFinancialYear}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
