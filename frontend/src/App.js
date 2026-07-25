import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import InstallPrompt from "@/components/InstallPrompt";

const Protected = ({ children }) => {
  const { user } = useAuth();
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
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
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
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
