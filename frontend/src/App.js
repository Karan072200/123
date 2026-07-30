import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { PremiumProvider } from './context/PremiumContext';
import { DashboardPrefsProvider } from './context/DashboardPrefsContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import BillingLayout from './components/billing/BillingLayout';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Accounts from './pages/Accounts';
import Udhaar from './pages/Udhaar';
import Parties from './pages/Parties';
import Products from './pages/Products';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Recurring from './pages/Recurring';
import Subscriptions from './pages/Subscriptions';
import Ledgers from './pages/Ledgers';
import Reports from './pages/Reports';
import BillingReports from './pages/BillingReports';
import Investments from './pages/Investments';
import TaxEstimator from './pages/TaxEstimator';
import WhatIf from './pages/WhatIf';
import Warranties from './pages/Warranties';
import KidsMoney from './pages/KidsMoney';
import Splits from './pages/Splits';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import Premium from './pages/Premium';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import PublicDeleteAccount from './pages/PublicDeleteAccount';

import BillingDashboardWorkspace from './pages/billing/BillingDashboardWorkspace';

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
      <AuthProvider>
        <PremiumProvider>
        <DashboardPrefsProvider>
        <PrivacyProvider>
          <Router>
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
              <Route path="/billing/quotations" element={<ProtectedBillingRoute><Invoices type="quotation" /></ProtectedBillingRoute>} />
              <Route path="/billing/proforma" element={<ProtectedBillingRoute><Invoices type="proforma" /></ProtectedBillingRoute>} />
              <Route path="/billing/challans" element={<ProtectedBillingRoute><Invoices type="challan" /></ProtectedBillingRoute>} />
              <Route path="/billing/sales-orders" element={<ProtectedBillingRoute><Invoices type="sales-order" /></ProtectedBillingRoute>} />
              <Route path="/billing/credit-notes" element={<ProtectedBillingRoute><Invoices type="credit-note" /></ProtectedBillingRoute>} />
              <Route path="/billing/purchase-orders" element={<ProtectedBillingRoute><Invoices type="purchase-order" /></ProtectedBillingRoute>} />
              <Route path="/billing/debit-notes" element={<ProtectedBillingRoute><Invoices type="debit-note" /></ProtectedBillingRoute>} />
              <Route path="/billing/parties" element={<ProtectedBillingRoute><Parties /></ProtectedBillingRoute>} />
              <Route path="/billing/inventory" element={<ProtectedBillingRoute><Products /></ProtectedBillingRoute>} />
              <Route path="/billing/outstanding" element={<ProtectedBillingRoute><Udhaar /></ProtectedBillingRoute>} />
              <Route path="/billing/ledgers" element={<ProtectedBillingRoute><Ledgers /></ProtectedBillingRoute>} />
              <Route path="/billing/payments" element={<ProtectedBillingRoute><Udhaar /></ProtectedBillingRoute>} />
              <Route path="/billing/reports" element={<ProtectedBillingRoute><BillingReports /></ProtectedBillingRoute>} />
              <Route path="/billing/settings" element={<ProtectedBillingRoute><Settings tab="billing" /></ProtectedBillingRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </PrivacyProvider>
        </DashboardPrefsProvider>
        </PremiumProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
