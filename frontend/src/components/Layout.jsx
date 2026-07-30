import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { usePrivacy } from "../context/PrivacyContext";
import { useTheme } from "../context/ThemeContext";
import {
  Menu, Eye, EyeOff, Search, User, Sun, Moon
} from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import GlobalSearch from "./GlobalSearch";
import ChatWidget from "./ChatWidget";
import QuickAddFAB from "./QuickAddFAB";

export default function Layout({ children }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navPrimary = [
    { label: "Dashboard", path: "/" },
    { label: "Transactions", path: "/transactions" },
    { label: "Billing", path: "/billing" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>

            <button onClick={() => navigate("/")} className="flex items-center space-x-2 focus:outline-none group">
              <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim Logo" className="w-8 h-8 rounded-md group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg tracking-tight text-emerald-800 dark:text-emerald-400 hidden md:inline">
                Apka Munim
              </span>
            </button>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navPrimary.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                    isActive ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button onClick={togglePrivacy} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {privacyOn ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => navigate("/settings")} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </header>

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      {searchOpen && <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <ChatWidget />
      <QuickAddFAB />
    </div>
  );
}
