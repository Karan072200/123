import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { DashboardPrefsProvider } from "@/context/DashboardPrefsContext";
import { Toaster } from "sonner";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Udhaar from "@/pages/Udhaar";
import Accounts from "@/pages/Accounts";
import Reports from "@/pages/Reports";
import Recurring from "@/pages/Recurring";
import Budgets from "@/pages/Budgets";
import Ledgers from "@/pages/Ledgers";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Settings from "@/pages/Settings";
import Goals from "@/pages/Goals";
import Subscriptions from "@/pages/Subscriptions";
import Splits from "@/pages/Splits";
import Investments from "@/pages/Investments";
import TaxEstimator from "@/pages/TaxEstimator";
import WhatIf from "@/pages/WhatIf";
import Warranties from "@/pages/Warranties";
import KidsMoney from "@/pages/KidsMoney";
import BillingDashboard from "@/pages/BillingDashboard";
import Products from "@/pages/Products";
import Parties from "@/pages/Parties";
import Invoices from "@/pages/Invoices";
import InvoiceCreate from "@/pages/InvoiceCreate";
import BillingReports from "@/pages/BillingReports";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import InstallPrompt from "@/components/InstallPrompt";
import useSEO from "@/hooks/useSEO";

const Protected = ({ children }) => {
  const { user } = useAuth();
  // Logged-in app pages hold private data and shouldn't be indexed by search engines.
  useSEO({ noindex: true, path: typeof window !== "undefined" ? window.location.pathname : "/" });
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#57534E]">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const PublicOnly = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <PrivacyProvider>
            <DashboardPrefsProvider>
            <Toaster position="top-right" richColors />
            <InstallPrompt />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/transactions" element={<Protected><Transactions /></Protected>} />
            <Route path="/udhaar" element={<Protected><Udhaar /></Protected>} />
            <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />
            <Route path="/recurring" element={<Protected><Recurring /></Protected>} />
            <Route path="/budgets" element={<Protected><Budgets /></Protected>} />
            <Route path="/ledgers" element={<Protected><Ledgers /></Protected>} />
            <Route path="/goals" element={<Protected><Goals /></Protected>} />
            <Route path="/subscriptions" element={<Protected><Subscriptions /></Protected>} />
            <Route path="/splits" element={<Protected><Splits /></Protected>} />
            <Route path="/investments" element={<Protected><Investments /></Protected>} />
            <Route path="/tax-estimator" element={<Protected><TaxEstimator /></Protected>} />
            <Route path="/what-if" element={<Protected><WhatIf /></Protected>} />
            <Route path="/warranties" element={<Protected><Warranties /></Protected>} />
            <Route path="/kids" element={<Protected><KidsMoney /></Protected>} />
            <Route path="/billing" element={<Protected><BillingDashboard /></Protected>} />
            <Route path="/billing/products" element={<Protected><Products /></Protected>} />
            <Route path="/billing/customers" element={<Protected><Parties kind="customer" /></Protected>} />
            <Route path="/billing/suppliers" element={<Protected><Parties kind="supplier" /></Protected>} />
            <Route path="/billing/invoices" element={<Protected><Invoices /></Protected>} />
            <Route path="/billing/invoices/new" element={<Protected><InvoiceCreate /></Protected>} />
            <Route path="/billing/invoices/:id/view" element={<Protected><InvoiceCreate /></Protected>} />
            <Route path="/billing/invoices/:id/edit" element={<Protected><InvoiceCreate /></Protected>} />
            <Route path="/billing/reports" element={<Protected><BillingReports /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </DashboardPrefsProvider>
          </PrivacyProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
