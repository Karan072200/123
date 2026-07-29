import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import BillingDashboard from './pages/BillingDashboard';
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

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PrivacyProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/delete-account" element={<PublicDeleteAccount />} />

              {/* Primary Nav Direct Access Modules */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />

              {/* Secondary Application Features */}
              <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
              <Route path="/udhaar" element={<ProtectedRoute><Udhaar /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Parties /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Parties /></ProtectedRoute>} />
              <Route path="/parties" element={<ProtectedRoute><Parties /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
              <Route path="/recurring" element={<ProtectedRoute><Recurring /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/ledgers" element={<ProtectedRoute><Ledgers /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/reports-ai" element={<ProtectedRoute><BillingReports /></ProtectedRoute>} />
              <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
              <Route path="/tax-estimator" element={<ProtectedRoute><TaxEstimator /></ProtectedRoute>} />
              <Route path="/what-if" element={<ProtectedRoute><WhatIf /></ProtectedRoute>} />
              <Route path="/warranties" element={<ProtectedRoute><Warranties /></ProtectedRoute>} />
              <Route path="/kids-money" element={<ProtectedRoute><KidsMoney /></ProtectedRoute>} />
              <Route path="/splits" element={<ProtectedRoute><Splits /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/create" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
              <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
              <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
