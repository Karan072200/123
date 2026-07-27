import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Landmark,
  Repeat,
  Target,
  Trophy,
  CreditCard,
  Users2,
  BarChart3,
  Settings as SettingsIcon,
  Moon,
  Sparkles,
  Mic,
  MessageSquareText,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  Split,
  LineChart,
  Calculator,
  FileUp,
  ShieldCheck,
  Baby,
  Receipt,
  Package,
} from "lucide-react";

// Static pages/features — always searchable client-side
const FEATURES = [
  { label: "Dashboard", desc: "Overview, balance, streak, health score", to: "/dashboard", icon: LayoutDashboard, keywords: "home main balance streak health emergency fund" },
  { label: "Transactions", desc: "Aaya / Gaya list, add income/expense", to: "/transactions", icon: ArrowLeftRight, keywords: "income expense kharcha aaya gaya paise entry" },
  { label: "Billing Dashboard", desc: "Sales, invoices, pending, low-stock", to: "/billing", icon: Receipt, keywords: "billing business sales gst tax invoice dukan" },
  { label: "Invoices", desc: "Create, print, GST invoice, quotation", to: "/billing/invoices", icon: Receipt, keywords: "invoice bill gst tax quotation proforma challan credit debit note print pdf" },
  { label: "Products", desc: "Inventory, HSN, GST rate, stock, barcode", to: "/billing/products", icon: Package, keywords: "product inventory item stock hsn gst barcode sku brand" },
  { label: "Customers", desc: "Customer ledger + outstanding", to: "/billing/customers", icon: Users, keywords: "customer party client gstin ledger receivable" },
  { label: "Suppliers", desc: "Supplier ledger + payables", to: "/billing/suppliers", icon: Users, keywords: "supplier vendor party purchase payable" },
  { label: "Udhaar Tracker", desc: "Kisse lene hai, kisko dene hai", to: "/udhaar", icon: Users, keywords: "loan lene dene borrow lend baaki" },
  { label: "Bill Splits", desc: "Splitwise-style expense sharing", to: "/splits", icon: Split, keywords: "split bill share dinner trip friends splitwise equal share" },
  { label: "Investments", desc: "Mutual Funds, Stocks, SIP, FD, RD tracker", to: "/investments", icon: LineChart, keywords: "investment mutual fund stock sip fd rd portfolio gain loss" },
  { label: "Tax Estimator", desc: "Income tax calculator (India FY 2025-26)", to: "/tax-estimator", icon: Calculator, keywords: "tax income india 80c 80d old new regime freelancer business ca" },
  { label: "What-If Simulator", desc: "Chhote badlaav se kitna bachega", to: "/what-if", icon: Sparkles, keywords: "what if simulator calculator savings zomato swiggy reduce goal faster" },
  { label: "Warranty & Bill Vault", desc: "Receipt + warranty tracker with reminders", to: "/warranties", icon: ShieldCheck, keywords: "warranty bill vault receipt reminder expiry tv fridge phone appliance electronics" },
  { label: "Kids Pocket Money", desc: "Bachcho ki allowance & savings tracker", to: "/kids", icon: Baby, keywords: "kids bachcha pocket money allowance children saving jar aarav aarohi" },
  { label: "Accounts", desc: "Savings, Current, Cash, Wallet, UPI", to: "/accounts", icon: Landmark, keywords: "bank savings current cash wallet upi paytm credit card emergency investment sip fd" },
  { label: "Recurring", desc: "Auto-repeating income/expense", to: "/recurring", icon: Repeat, keywords: "auto repeat monthly weekly salary rent emi" },
  { label: "Budgets", desc: "Monthly category limits + alerts", to: "/budgets", icon: Target, keywords: "budget limit category alert" },
  { label: "Financial Goals", desc: "iPhone, Trip, House — target amount", to: "/goals", icon: Trophy, keywords: "goal target saving iphone trip house dream" },
  { label: "Subscriptions", desc: "Netflix, Spotify, Prime tracker", to: "/subscriptions", icon: CreditCard, keywords: "netflix spotify prime hotstar recurring monthly plan" },
  { label: "Ledgers (Family)", desc: "Shared family/office khata", to: "/ledgers", icon: Users2, keywords: "shared family office ledger group" },
  { label: "Reports & AI Insights", desc: "Charts, AI analysis, PDF/CSV export", to: "/reports", icon: BarChart3, keywords: "report chart graph ai insights export pdf csv analysis" },
  { label: "Settings", desc: "Profile, PIN, password, currency, 2FA", to: "/settings", icon: SettingsIcon, keywords: "settings profile pin password currency preference 2fa two factor" },
];

const QUICK_ACTIONS = [
  { label: "Add Transaction", desc: "Naya income ya kharcha add karo", to: "/transactions?add=1", icon: ArrowLeftRight, keywords: "add new income expense" },
  { label: "Import Bank Statement", desc: "CSV/PDF upload karo, auto-parse", to: "/transactions?import=1", icon: FileUp, keywords: "import csv pdf statement bank upload parse" },
  { label: "Add Warranty", desc: "Naya bill/warranty save karo", to: "/warranties", icon: ShieldCheck, keywords: "add new warranty bill receipt" },
  { label: "Add Kid Allowance", desc: "Bachche ko pocket money do", to: "/kids", icon: Baby, keywords: "add kid child allowance pocket money" },
  { label: "Try What-If", desc: "Savings simulate karo", to: "/what-if", icon: Sparkles, keywords: "what if simulate savings calculator" },
  { label: "Add Account", desc: "Naya bank/wallet account", to: "/accounts?add=1", icon: Landmark, keywords: "add new bank account" },
  { label: "Add Goal", desc: "Nayi saving goal set karo", to: "/goals?add=1", icon: Trophy, keywords: "add new goal target" },
  { label: "Add Subscription", desc: "Netflix/Spotify plan add karo", to: "/subscriptions?add=1", icon: CreditCard, keywords: "add new subscription" },
  { label: "Add Bill Split", desc: "Naya expense share karo", to: "/splits?add=1", icon: Split, keywords: "add new split bill share" },
  { label: "Add Investment", desc: "MF/Stock/SIP entry", to: "/investments?add=1", icon: LineChart, keywords: "add new investment mutual fund stock" },
  { label: "Toggle Dark Mode", desc: "Light / Dark theme switch", action: "toggle-theme", icon: Moon, keywords: "dark light theme toggle mode" },
  { label: "Voice Input", desc: "Bolke transaction add karo", to: "/transactions?voice=1", icon: Mic, keywords: "voice bolke speak record microphone" },
  { label: "AI Chat — Munim Ji", desc: "Financial advice chat bot", action: "open-chat", icon: MessageSquareText, keywords: "ai chat munim ji help advice bot" },
  { label: "Logout", desc: "Account se sign out karo", action: "logout", icon: LogOut, keywords: "logout signout exit" },
];

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ transactions: [], udhaar: [], accounts: [], goals: [], subscriptions: [] });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const currency = user?.currency || "INR";

  // Debounced server search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults({ transactions: [], udhaar: [], accounts: [], goals: [], subscriptions: [] });
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await http.get("/search", { params: { q } });
        setResults(data);
      } catch {
        setResults({ transactions: [], udhaar: [], accounts: [], goals: [], subscriptions: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ transactions: [], udhaar: [], accounts: [], goals: [], subscriptions: [] });
    }
  }, [open]);

  const close = () => onOpenChange(false);

  const goTo = (to) => {
    close();
    setTimeout(() => nav(to), 50);
  };

  const runAction = async (action) => {
    close();
    if (action === "logout") {
      await logout();
      nav("/login");
    } else if (action === "toggle-theme") {
      const btn = document.querySelector('[data-testid="theme-toggle-btn"], [data-testid="mobile-theme-toggle"]');
      btn?.click();
    } else if (action === "open-chat") {
      setTimeout(() => {
        const btn = document.querySelector('[data-testid="chat-widget-open-btn"]');
        btn?.click();
      }, 100);
    }
  };

  const q = query.trim().toLowerCase();
  const filteredFeatures = useMemo(() => {
    if (!q) return FEATURES;
    return FEATURES.filter((f) =>
      (f.label + " " + f.desc + " " + f.keywords).toLowerCase().includes(q)
    );
  }, [q]);
  const filteredActions = useMemo(() => {
    if (!q) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter((a) =>
      (a.label + " " + a.desc + " " + a.keywords).toLowerCase().includes(q)
    );
  }, [q]);

  const hasAnyData =
    (results.transactions?.length || 0) +
    (results.udhaar?.length || 0) +
    (results.accounts?.length || 0) +
    (results.goals?.length || 0) +
    (results.subscriptions?.length || 0) > 0;

  const showNothing =
    q.length >= 2 &&
    !loading &&
    !hasAnyData &&
    filteredFeatures.length === 0 &&
    filteredActions.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Kuch bhi search karo — transactions, features, actions..."
        value={query}
        onValueChange={setQuery}
        data-testid="global-search-input"
      />
      <CommandList data-testid="global-search-results">
        {showNothing && (
          <CommandEmpty>
            <div className="py-6 text-center text-sm text-[#78716C]">
              <Sparkles className="w-5 h-5 mx-auto mb-2 text-[#A8A29E]" />
              "{query}" — kuch nahi mila. Try transactions, goals, subscriptions ya feature names.
            </div>
          </CommandEmpty>
        )}

        {filteredFeatures.length > 0 && (
          <CommandGroup heading="Pages / Features">
            {filteredFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <CommandItem
                  key={f.to}
                  value={`page-${f.label}-${f.keywords}`}
                  onSelect={() => goTo(f.to)}
                  data-testid={`search-feature-${f.to.replace(/\W/g, "-")}`}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4 text-[#2A4F4F]" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-xs text-[#78716C] truncate">{f.desc}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              {filteredActions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem
                    key={a.label}
                    value={`action-${a.label}-${a.keywords}`}
                    onSelect={() => (a.action ? runAction(a.action) : goTo(a.to))}
                    data-testid={`search-action-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4 text-[#B8763A]" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium">{a.label}</span>
                      <span className="text-xs text-[#78716C] truncate">{a.desc}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {results.transactions?.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Transactions (${results.transactions.length})`}>
              {results.transactions.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`txn-${t.id}`}
                  onSelect={() => goTo("/transactions")}
                  data-testid={`search-txn-${t.id}`}
                  className="cursor-pointer"
                >
                  {t.type === "income" ? (
                    <TrendingUp className="mr-2 h-4 w-4 text-[#3F6E4A]" />
                  ) : (
                    <TrendingDown className="mr-2 h-4 w-4 text-[#B8763A]" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.note || t.category}</span>
                      <span className={`text-sm font-semibold whitespace-nowrap ${t.type === "income" ? "text-[#3F6E4A]" : "text-[#B8763A]"}`}>
                        {t.type === "income" ? "+" : "−"}{formatMoney(t.amount, currency)}
                      </span>
                    </div>
                    <span className="text-xs text-[#78716C] truncate">
                      {t.category} • {t.account_name} • {new Date(t.date).toLocaleDateString()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.udhaar?.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Udhaar (${results.udhaar.length})`}>
              {results.udhaar.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`udh-${u.id}`}
                  onSelect={() => goTo("/udhaar")}
                  data-testid={`search-udhaar-${u.id}`}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 text-[#B8763A]" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{u.person_name}</span>
                      <span className="text-sm font-semibold whitespace-nowrap text-[#57534E]">
                        {u.type === "lent" ? "Lena" : "Dena"}: {formatMoney(u.amount, currency)}
                      </span>
                    </div>
                    {u.note && <span className="text-xs text-[#78716C] truncate">{u.note}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.accounts?.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Accounts (${results.accounts.length})`}>
              {results.accounts.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`acc-${a.id}`}
                  onSelect={() => goTo("/accounts")}
                  data-testid={`search-account-${a.id}`}
                  className="cursor-pointer"
                >
                  <Wallet className="mr-2 h-4 w-4 text-[#2A4F4F]" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="text-sm font-semibold whitespace-nowrap text-[#1C1917]">
                        {formatMoney(a.balance || 0, currency)}
                      </span>
                    </div>
                    <span className="text-xs text-[#78716C] uppercase">{a.type}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.goals?.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Goals (${results.goals.length})`}>
              {results.goals.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`goal-${g.id}`}
                  onSelect={() => goTo("/goals")}
                  data-testid={`search-goal-${g.id}`}
                  className="cursor-pointer"
                >
                  <Trophy className="mr-2 h-4 w-4 text-[#B8763A]" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{g.emoji || "🎯"} {g.name}</span>
                      <span className="text-sm font-semibold whitespace-nowrap text-[#57534E]">
                        {formatMoney(g.saved_amount || 0, currency)} / {formatMoney(g.target_amount || 0, currency)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.subscriptions?.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Subscriptions (${results.subscriptions.length})`}>
              {results.subscriptions.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`sub-${s.id}`}
                  onSelect={() => goTo("/subscriptions")}
                  data-testid={`search-sub-${s.id}`}
                  className="cursor-pointer"
                >
                  <CreditCard className="mr-2 h-4 w-4 text-[#2A4F4F]" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{s.emoji || "📺"} {s.name}</span>
                      <span className="text-sm font-semibold whitespace-nowrap text-[#57534E]">
                        {formatMoney(s.amount || 0, currency)}/{s.billing_cycle || "month"}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
