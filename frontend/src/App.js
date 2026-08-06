import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { PremiumProvider } from './context/PremiumContext';
import { DashboardPrefsProvider } from './context/DashboardPrefsContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

import Layout from './components/Layout';
import BillingLayout from './components/billing/BillingLayout';

// Route-level code splitting: each page is its own chunk, fetched on
// navigation instead of all 40+ pages shipping in the initial bundle.
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Udhaar = lazy(() => import('./pages/Udhaar'));
const Parties = lazy(() => import('./pages/Parties'));
const Products = lazy(() => import('./pages/Products'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Goals = lazy(() => import('./pages/Goals'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Ledgers = lazy(() => import('./pages/Ledgers'));
const Reports = lazy(() => import('./pages/Reports'));
const BillingReports = lazy(() => import('./pages/BillingReports'));
const Investments = lazy(() => import('./pages/Investments'));
const TaxEstimator = lazy(() => import('./pages/TaxEstimator'));
const WhatIf = lazy(() => import('./pages/WhatIf'));
const Warranties = lazy(() => import('./pages/Warranties'));
const KidsMoney = lazy(() => import('./pages/KidsMoney'));
const Splits = lazy(() => import('./pages/Splits'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceCreate = lazy(() => import('./pages/InvoiceCreate'));
const RecurringInvoices = lazy(() => import('./pages/RecurringInvoices'));
const InvoiceTemplates = lazy(() => import('./pages/InvoiceTemplates'));
const BankPayments = lazy(() => import('./pages/BankPayments'));
const WebhookSetup = lazy(() => import('./pages/WebhookSetup'));
const Premium = lazy(() => import('./pages/Premium'));
const Settings = lazy(() => import('./pages/Settings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const PublicDeleteAccount = lazy(() => import('./pages/PublicDeleteAccount'));

const BillingDashboardWorkspace = lazy(() => import('./pages/billing/BillingDashboardWorkspace'));
const SalesReturns = lazy(() => import('./pages/billing/SalesReturns'));
const CustomerLedger = lazy(() => import('./pages/billing/CustomerLedger'));
const SupplierLedger = lazy(() => import('./pages/billing/SupplierLedger'));
const InventoryAdjustments = lazy(() => import('./pages/billing/InventoryAdjustments'));
const PartyProfile = lazy(() => import('./pages/billing/PartyProfile'));
const PurchaseBills = lazy(() => import('./pages/billing/PurchaseBills'));

// Phase 8 (Manufacturing) + Phase 5 (Accounting Reports) — added in Foundation-Fix session
const Manufacturing = lazy(() => import('./pages/Manufacturing'));
const AccountingReports = lazy(() => import('./pages/AccountingReports'));

function RouteFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}

function ProtectedMainRoute({ children }) {
  const { user } = useAuth();
  if (user === null) return null; // still checking session via /auth/me
  if (user === false) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function ProtectedBillingRoute({ children }) {
  const { user } = useAuth();
  if (user === null) return null; // still checking session via /auth/me
  if (user === false) return <Navigate to="/login" replace />;
  // Billing is a standalone ERP workspace — it owns its own sidebar + header
  // and does NOT sit inside the main personal-finance Layout. Users can jump
  // back to the personal workspace via the "Back to Personal" button.
  return <BillingLayout>{children}</BillingLayout>;
}

function RootRoute() {
  const { user } = useAuth();
  if (user === null) return null; // still checking session via /auth/me
  if (user === false) return <Landing />;
  return <Layout><Dashboard /></Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <PremiumProvider>
        <DashboardPrefsProvider>
        <PrivacyProvider>
          <Router>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/delete-account" element={<PublicDeleteAccount />} />

              <Route path="/" element={<RootRoute />} />
              <Route path="/dashboard" element={<ProtectedMainRoute><Dashboard /></ProtectedMainRoute>} />
              <Route path="/transactions" element={<ProtectedMainRoute><Transactions /></ProtectedMainRoute>} />
              <Route path="/accounts" element={<ProtectedMainRoute><Accounts /></ProtectedMainRoute>} />
              <Route path="/udhaar" element={<ProtectedMainRoute><Udhaar /></ProtectedMainRoute>} />
              <Route path="/customers" element={<ProtectedMainRoute><Parties /></ProtectedMainRoute>} />
              <Route path="/suppliers" element={<ProtectedMainRoute><Parties /></ProtectedMainRoute>} />
              <Route path="/parties" element={<ProtectedMainRoute><Parties /></ProtectedMainRoute>} />
              <Route path="/products" element={<ProtectedMainRoute><Products /></ProtectedMainRoute>} />
              <Route path="/inventory" element={<ProtectedMainRoute><Products /></ProtectedMainRoute>} />
              <Route path="/budgets" element={<ProtectedMainRoute><Budgets /></ProtectedMainRoute>} />
              <Route path="/goals" element={<ProtectedMainRoute><Goals /></ProtectedMainRoute>} />
              <Route path="/recurring" element={<ProtectedMainRoute><Recurring /></ProtectedMainRoute>} />
              <Route path="/subscriptions" element={<ProtectedMainRoute><Subscriptions /></ProtectedMainRoute>} />
              <Route path="/ledgers" element={<ProtectedMainRoute><Ledgers /></ProtectedMainRoute>} />
              <Route path="/reports" element={<ProtectedMainRoute><Reports /></ProtectedMainRoute>} />
              <Route path="/reports-ai" element={<ProtectedMainRoute><BillingReports /></ProtectedMainRoute>} />
              <Route path="/investments" element={<ProtectedMainRoute><Investments /></ProtectedMainRoute>} />
              <Route path="/tax-estimator" element={<ProtectedMainRoute><TaxEstimator /></ProtectedMainRoute>} />
              <Route path="/what-if" element={<ProtectedMainRoute><WhatIf /></ProtectedMainRoute>} />
              <Route path="/warranties" element={<ProtectedMainRoute><Warranties /></ProtectedMainRoute>} />
              <Route path="/kids-money" element={<ProtectedMainRoute><KidsMoney /></ProtectedMainRoute>} />
              <Route path="/splits" element={<ProtectedMainRoute><Splits /></ProtectedMainRoute>} />
              <Route path="/premium" element={<ProtectedMainRoute><Premium /></ProtectedMainRoute>} />
              <Route path="/settings" element={<ProtectedMainRoute><Settings /></ProtectedMainRoute>} />
              <Route path="/privacy" element={<ProtectedMainRoute><Privacy /></ProtectedMainRoute>} />
              <Route path="/terms" element={<ProtectedMainRoute><Terms /></ProtectedMainRoute>} />

              <Route path="/billing" element={<ProtectedBillingRoute><BillingDashboardWorkspace /></ProtectedBillingRoute>} />
              <Route path="/billing/invoices" element={<ProtectedBillingRoute><Invoices /></ProtectedBillingRoute>} />
              <Route path="/billing/invoices/new" element={<ProtectedBillingRoute><InvoiceCreate /></ProtectedBillingRoute>} />
              <Route path="/billing/invoices/:id/edit" element={<ProtectedBillingRoute><InvoiceCreate /></ProtectedBillingRoute>} />
              <Route path="/billing/invoices/:id/view" element={<ProtectedBillingRoute><InvoiceCreate /></ProtectedBillingRoute>} />
              <Route path="/billing/recurring-invoices" element={<ProtectedBillingRoute><RecurringInvoices /></ProtectedBillingRoute>} />
              <Route path="/billing/invoice-templates" element={<ProtectedBillingRoute><InvoiceTemplates /></ProtectedBillingRoute>} />
              <Route path="/billing/bank-payments" element={<ProtectedBillingRoute><BankPayments /></ProtectedBillingRoute>} />
              <Route path="/settings/webhook" element={<ProtectedMainRoute><WebhookSetup /></ProtectedMainRoute>} />
              <Route path="/billing/quotations" element={<ProtectedBillingRoute><Invoices type="quotation" /></ProtectedBillingRoute>} />
              <Route path="/billing/proforma" element={<ProtectedBillingRoute><Invoices type="proforma" /></ProtectedBillingRoute>} />
              <Route path="/billing/challans" element={<ProtectedBillingRoute><Invoices type="challan" /></ProtectedBillingRoute>} />
              <Route path="/billing/sales-orders" element={<ProtectedBillingRoute><Invoices type="sales-order" /></ProtectedBillingRoute>} />
              <Route path="/billing/credit-notes" element={<ProtectedBillingRoute><Invoices type="credit-note" /></ProtectedBillingRoute>} />
              <Route path="/billing/purchase-orders" element={<ProtectedBillingRoute><Invoices type="purchase-order" /></ProtectedBillingRoute>} />
              <Route path="/billing/debit-notes" element={<ProtectedBillingRoute><Invoices type="debit-note" /></ProtectedBillingRoute>} />
              <Route path="/billing/parties" element={<ProtectedBillingRoute><Parties /></ProtectedBillingRoute>} />
              <Route path="/billing/parties/:id" element={<ProtectedBillingRoute><PartyProfile /></ProtectedBillingRoute>} />
              <Route path="/billing/purchase-bills" element={<ProtectedBillingRoute><PurchaseBills /></ProtectedBillingRoute>} />
              <Route path="/billing/inventory" element={<ProtectedBillingRoute><Products /></ProtectedBillingRoute>} />
              <Route path="/billing/inventory-adjustments" element={<ProtectedBillingRoute><InventoryAdjustments /></ProtectedBillingRoute>} />
              <Route path="/billing/outstanding" element={<ProtectedBillingRoute><Udhaar /></ProtectedBillingRoute>} />
              <Route path="/billing/ledgers" element={<ProtectedBillingRoute><Ledgers /></ProtectedBillingRoute>} />
              <Route path="/billing/customer-ledger" element={<ProtectedBillingRoute><CustomerLedger /></ProtectedBillingRoute>} />
              <Route path="/billing/supplier-ledger" element={<ProtectedBillingRoute><SupplierLedger /></ProtectedBillingRoute>} />
              <Route path="/billing/sales-returns" element={<ProtectedBillingRoute><SalesReturns /></ProtectedBillingRoute>} />
              <Route path="/billing/payments" element={<ProtectedBillingRoute><Udhaar /></ProtectedBillingRoute>} />
              <Route path="/billing/reports" element={<ProtectedBillingRoute><BillingReports /></ProtectedBillingRoute>} />
              <Route path="/billing/settings" element={<ProtectedBillingRoute><Settings tab="billing" /></ProtectedBillingRoute>} />

              {/* Phase 8 — Manufacturing / Garment ERP workspace */}
              <Route path="/manufacturing" element={<ProtectedMainRoute><Manufacturing /></ProtectedMainRoute>} />
              <Route path="/billing/manufacturing" element={<ProtectedBillingRoute><Manufacturing /></ProtectedBillingRoute>} />

              {/* Phase 5 — Accounting Reports (Trial Balance / P&L / Balance Sheet / GST) */}
              <Route path="/accounting-reports" element={<ProtectedMainRoute><AccountingReports /></ProtectedMainRoute>} />
              <Route path="/billing/accounting-reports" element={<ProtectedBillingRoute><AccountingReports /></ProtectedBillingRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Router>
        </PrivacyProvider>
        </DashboardPrefsProvider>
        </PremiumProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
