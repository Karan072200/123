import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import {
  X,
  Users,
  UserCheck,
  BookOpen,
  Scale,
  Package,
  Boxes,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  FileText,
  BarChart3,
  PieChart,
  ShieldAlert,
  Calendar,
  Target,
  Receipt,
  Crown,
  Settings as SettingsIcon,
  Trash2,
  LogOut,
  Wallet,
  Calculator,
  Sparkles,
  ShieldCheck,
  Baby,
  Split,
  Bot,
  ArrowUpDown,
  History,
  Tag,
  Ruler,
  QrCode,
  BadgeIndianRupee,
  ClipboardList,
  BookMarked,
  Languages,
  IndianRupee,
  HelpCircle,
  ShieldQuestion,
} from 'lucide-react';

export default function HamburgerMenu({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try { if (logout) await logout(); } catch { /* noop */ }
    onClose();
    navigate('/login');
  };

  const menuSections = [
    {
      title: t('section_business', 'BUSINESS').toUpperCase(),
      items: [
        { label: 'Customers', path: '/customers', icon: Users },
        { label: 'Suppliers', path: '/suppliers', icon: UserCheck },
        { label: 'Customer Groups', path: '/parties?tab=groups&type=customer', icon: Users },
        { label: 'Supplier Groups', path: '/parties?tab=groups&type=supplier', icon: UserCheck },
        { label: 'Ledgers', path: '/ledgers', icon: BookOpen },
        { label: 'Accounts', path: '/accounts', icon: Wallet },
        { label: 'Udhaar / Outstanding', path: '/udhaar', icon: Scale },
      ],
    },
    {
      title: t('section_products', 'PRODUCTS & INVENTORY').toUpperCase(),
      items: [
        { label: 'Products & Services', path: '/products', icon: Package },
        { label: 'Product Categories', path: '/products?tab=categories', icon: Tag },
        { label: 'Brands', path: '/products?tab=brands', icon: BadgeIndianRupee },
        { label: 'Units', path: '/products?tab=units', icon: Ruler },
        { label: 'HSN / SAC', path: '/products?tab=hsn', icon: ClipboardList },
        { label: 'Barcode / QR', path: '/products?tab=barcodes', icon: QrCode },
        { label: 'Inventory / Stock', path: '/inventory', icon: Boxes },
        { label: 'Low Stock', path: '/inventory?filter=low-stock', icon: AlertTriangle },
        { label: 'Stock Adjustment', path: '/inventory?tab=adjustment', icon: ArrowUpDown },
        { label: 'Stock History', path: '/inventory?tab=history', icon: History },
      ],
    },
    {
      title: t('section_payments', 'PAYMENTS').toUpperCase(),
      items: [
        { label: 'Payment Received', path: '/billing/payments?type=received', icon: TrendingUp },
        { label: 'Payment Made', path: '/billing/payments?type=made', icon: TrendingDown },
        { label: 'Receivables', path: '/billing/outstanding?type=customer', icon: Receipt },
        { label: 'Payables', path: '/billing/outstanding?type=supplier', icon: Receipt },
      ],
    },
    {
      title: t('section_expense', 'EXPENSE & INCOME').toUpperCase(),
      items: [
        { label: 'Daily Expenses', path: '/transactions?type=expense', icon: TrendingDown },
        { label: 'Other Income', path: '/transactions?type=income', icon: TrendingUp },
        { label: 'Recurring Payments', path: '/recurring', icon: RotateCcw },
      ],
    },
    {
      title: 'SALES REPORTS',
      items: [
        { label: 'Sales Report', path: '/billing/reports?type=sales', icon: BarChart3 },
        { label: 'Sales Outstanding', path: '/billing/reports?type=sales-outstanding', icon: FileText },
        { label: 'Sales Product Report', path: '/billing/reports?type=sales-product', icon: FileText },
        { label: 'Sales Payment Report', path: '/billing/reports?type=sales-payment', icon: FileText },
      ],
    },
    {
      title: 'PURCHASE REPORTS',
      items: [
        { label: 'Purchase Report', path: '/billing/reports?type=purchase', icon: BarChart3 },
        { label: 'Purchase Outstanding', path: '/billing/reports?type=purchase-outstanding', icon: FileText },
        { label: 'Purchase Product Report', path: '/billing/reports?type=purchase-product', icon: FileText },
        { label: 'Purchase Payment Report', path: '/billing/reports?type=purchase-payment', icon: FileText },
      ],
    },
    {
      title: 'BUSINESS REPORTS',
      items: [
        { label: 'Customer Ledger', path: '/billing/reports?type=customer-ledger', icon: BookMarked },
        { label: 'Supplier Ledger', path: '/billing/reports?type=supplier-ledger', icon: BookMarked },
        { label: 'Day Book', path: '/billing/reports?type=daybook', icon: BookOpen },
        { label: 'Profit & Loss', path: '/billing/reports?type=pnl', icon: PieChart },
        { label: 'Stock Report', path: '/billing/reports?type=stock', icon: Boxes },
        { label: 'GST Summary', path: '/billing/reports?type=gst', icon: ShieldAlert },
        { label: 'All Reports & AI', path: '/reports-ai', icon: BarChart3 },
        { label: 'Business Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      title: 'OTHER FEATURES',
      items: [
        { label: 'Budgets', path: '/budgets', icon: Calendar },
        { label: 'Financial Goals', path: '/goals', icon: Target },
        { label: 'Subscriptions Vault', path: '/subscriptions', icon: Receipt },
        { label: 'Investments', path: '/investments', icon: Wallet },
        { label: 'Tax Estimator', path: '/tax-estimator', icon: Calculator },
        { label: 'What-If Simulator', path: '/what-if', icon: Sparkles },
        { label: 'Warranty Vault', path: '/warranties', icon: ShieldCheck },
        { label: 'Kids Allowance', path: '/kids-money', icon: Baby },
        { label: 'Bill Splitter', path: '/splits', icon: Split },
        { label: 'AI Assistant', path: '/reports-ai', icon: Bot },
      ],
    },
    {
      title: t('section_account', 'ACCOUNT').toUpperCase(),
      items: [
        { label: 'Upgrade to Premium', path: '/premium', icon: Crown, highlight: true },
        { label: 'Business Profile', path: '/settings?tab=profile', icon: SettingsIcon },
        { label: 'Settings', path: '/settings', icon: SettingsIcon },
        { label: 'Language', path: '/settings?tab=language', icon: Languages },
        { label: 'Currency', path: '/settings?tab=currency', icon: IndianRupee },
        { label: 'Privacy Policy', path: '/privacy', icon: ShieldQuestion },
        { label: 'Terms & Conditions', path: '/terms', icon: FileText },
        { label: 'Help & Support', path: '/settings?tab=help', icon: HelpCircle },
        { label: 'Delete Account', path: '/settings?tab=delete-account', icon: Trash2, danger: true },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
          <div className="p-4 bg-emerald-800 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3 min-w-0">
              <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-9 h-9 rounded-lg bg-white p-1 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-tight truncate">Apka Munim</h2>
                <p className="text-xs text-emerald-200 truncate">{user?.email || 'Accounting Workspace'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-emerald-700 transition-colors"
              data-testid="hamburger-close-btn"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path.split('?')[0] &&
                      (item.path.split('?')[1] ? location.search.includes(item.path.split('?')[1].split('=')[0]) : true);
                    return (
                      <button
                        key={itemIdx}
                        onClick={() => handleNav(item.path)}
                        data-testid={`menu-item-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold'
                            : item.danger
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            : item.highlight
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 font-semibold hover:bg-amber-100'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.danger
                              ? 'text-rose-500'
                              : item.highlight
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={handleLogout}
              data-testid="hamburger-logout-btn"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
