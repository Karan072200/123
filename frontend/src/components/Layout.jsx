import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { usePrivacy } from "../context/PrivacyContext";
import { useTheme } from "../context/ThemeContext";
import { useLang, LANGUAGES } from "../context/LanguageContext";
import { Menu, Eye, EyeOff, Search, User, Sun, Moon, Globe, Check } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import GlobalSearch from "./GlobalSearch";
import ChatWidget from "./ChatWidget";
import QuickAddFAB from "./QuickAddFAB";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Layout({ children }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy();
  const { lang, setLang, t } = useLang();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navPrimary = [
    { key: "dashboard", path: "/" },
    { key: "transactions", path: "/transactions" },
    { key: "billing", path: "/billing" },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              data-testid="layout-hamburger-btn"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <button onClick={() => navigate("/")} className="flex items-center space-x-2 focus:outline-none group" data-testid="layout-logo-btn">
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
                  data-testid={`primary-nav-${item.key}`}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                    isActive ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {t(item.key)}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("search")}>
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button onClick={togglePrivacy} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={privacyOn ? t("privacy_off") : t("privacy_on")}>
              {privacyOn ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("theme_toggle")}>
              {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Language switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                data-testid="lang-switcher-btn"
                aria-label={t("language")}
              >
                <Globe className="w-4 h-4" />
                <span className="text-[11px] font-semibold hidden sm:inline">{currentLang.code.toUpperCase()}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs w-44">
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    data-testid={`lang-option-${l.code}`}
                  >
                    <span className="flex-1">{l.native}</span>
                    <span className="text-[10px] text-slate-400 mr-2">{l.label}</span>
                    {lang === l.code && <Check className="w-3 h-3 text-emerald-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => navigate("/settings")} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" data-testid="layout-profile-btn">
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
