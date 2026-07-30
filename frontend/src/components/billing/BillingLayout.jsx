import React from "react";
import BillingSubNav from "./BillingSubNav";

/**
 * Thin wrapper around the Billing workspace.
 * App.js already wraps this inside the main <Layout>, so the global header
 * (Dashboard / Transactions / Billing primary nav) is preserved on every
 * billing page. This component only adds the Billing secondary nav.
 */
export default function BillingLayout({ children }) {
  return (
    <div className="space-y-4">
      <BillingSubNav />
      <div>{children}</div>
    </div>
  );
}
