import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Wallet, LayoutDashboard, ArrowLeftRight, Users, Landmark, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, testid: "nav-transactions" },
  { to: "/udhaar", label: "Udhaar", icon: Users, testid: "nav-udhaar" },
  { to: "/accounts", label: "Accounts", icon: Landmark, testid: "nav-accounts" },
  { to: "/reports", label: "Reports & AI", icon: BarChart3, testid: "nav-reports" },
];

export default function Layout({ children }) {
  const { user, logout, setCurrency } = useAuth();
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    nav("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#F9F8F6]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E7E5DF] p-5">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-[#1C1917]">PaisaBook</span>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2A4F4F] text-white"
                    : "text-[#57534E] hover:bg-[#F2F0EA] hover:text-[#1C1917]"
                }`
              }>
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-[#E7E5DF] space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E] mb-1.5">Currency</div>
            <Select value={user?.currency || "INR"} onValueChange={setCurrency}>
              <SelectTrigger className="border-[#E7E5DF] h-9 text-sm" data-testid="sidebar-currency-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-[#78716C] truncate">{user?.email}</div>
          <Button variant="outline" onClick={doLogout} data-testid="logout-button"
            className="w-full border-[#E7E5DF] text-[#57534E] hover:bg-[#F2F0EA]">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile nav */}
        <div className="md:hidden bg-white border-b border-[#E7E5DF] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading text-lg font-bold">PaisaBook</span>
          </div>
          <Button variant="ghost" size="sm" onClick={doLogout} data-testid="mobile-logout-button">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <div className="md:hidden bg-white border-b border-[#E7E5DF] px-2 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  isActive ? "bg-[#2A4F4F] text-white" : "text-[#57534E] bg-[#F2F0EA]"
                }`
              }>
              <n.icon className="w-3.5 h-3.5" />
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
