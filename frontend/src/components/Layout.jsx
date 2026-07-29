import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { usePrivacy } from '../context/PrivacyContext';
import { Menu, Eye, EyeOff, Search, User } from 'lucide-react';
import HamburgerMenu from './HamburgerMenu';
import GlobalSearch from './GlobalSearch';

export default function Layout({ children }) {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navPrimary = [
    { label: 'Dashboard', path: '/' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Billing', path: '/billing' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Clean Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* LEFT: Hamburger & Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <button 
              onClick={() => navigate('/')} 
              className="flex items-center space-x-2 focus:outline-none group"
            >
              <img 
                src="/apkamunim-playstore-icon-512.png" 
                alt="Apka Munim Logo" 
                className="w-8 h-8 rounded-md group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-lg tracking-tight text-emerald-800 dark:text-emerald-400 hidden sm:inline">
                Apka Munim
              </span>
            </button>
          </div>

          {/* MIDDLE: Primary Tabs (Dashboard, Transactions, Billing) */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navPrimary.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* RIGHT: Global Search, Privacy Mode Toggle, Profile */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Global Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={togglePrivacyMode}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={isPrivacyMode ? "Show Amounts" : "Hide Amounts"}
            >
              {isPrivacyMode ? <EyeOff className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5" />}
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              title="Settings"
            >
              <User className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Hamburger Side Drawer */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Search Modal */}
      {isSearchOpen && <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
