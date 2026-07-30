import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddAccountDialog from "@/components/AddAccountDialog";
import SmsParseDialog from "@/components/SmsParseDialog";
import HealthScoreCard from "@/components/HealthScoreCard";
import StreakCard from "@/components/StreakCard";
import VibeCard from "@/components/VibeCard";
import NetWorthCard from "@/components/NetWorthCard";
import BadgesCard from "@/components/BadgesCard";
import EmergencyFundCard from "@/components/EmergencyFundCard";
import OverdueDigestCard from "@/components/OverdueDigestCard";
import {
  TrendingUp, TrendingDown, Wallet, Users, ArrowUpRight, ArrowDownRight, Plus, MessageSquare,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MoneyValue } from "@/context/PrivacyContext";
import { useDashboardPrefs } from "@/context/DashboardPrefsContext";
import DateFilter, { computeRange } from "@/components/DateFilter";
import AdSlot from "@/components/AdSlot";

const Stat = ({ label, value, icon: Icon, tone, testid, to }) => {
  const toneMap = {
    primary: "bg-[#2A4F4F] text-white",
    income: "bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/20",
    expense: "bg-[#D96C52]/10 text-[#B15039] border border-[#D96C52]/20",
    warn: "bg-[#E8B365]/15 text-[#8B6220] border border-[#E8B365]/25",
  };
  const nav = useNavigate();
  const Wrap = to ? "button" : "div";
  return (
    <Wrap data-testid={testid}
      onClick={to ? () => nav(to) : undefined}
      className={`rounded-xl p-5 soft-rise text-left w-full ${to ? "hover:scale-[1.02] transition-transform cursor-pointer" : ""} ${toneMap[tone] || toneMap.primary}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-80">{label}</span>
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="font-heading text-2xl md:text-3xl font-bold">
        <MoneyValue>{value}</MoneyValue>
      </div>
    </Wrap>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { widgets } = useDashboardPrefs();
  const [summary, setSummary] = useState(null);
  const [datePreset, setDatePreset] = useState("all");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [accounts, setAccounts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [openTxn, setOpenTxn] = useState(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [openSms, setOpenSms] = useState(false);
  const cur = user?.currency || "INR";

  const load = async () => {
    // Auto-run recurring transactions first (safe to call repeatedly)
    try { await http.post("/recurring/run"); } catch (e) { console.warn("recurring/run failed:", e?.message); }
    const range = computeRange(datePreset, customRange);
    const qs = range.from ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : "";
    const [s, a, t] = await Promise.all([
      http.get(`/analytics/summary${qs}`).then((r) => r.data).catch(async () => (await http.get("/analytics/summary")).data),
      http.get("/accounts").then((r) => r.data),
      http.get("/transactions?limit=6").then((r) => r.data),
    ]);
    setSummary(s);
    setAccounts(a);
    setRecent(t.slice(0, 6));
  };

  useEffect(() => { load(); }, [datePreset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      <OverdueDigestCard />
      <AdSlot />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E]">
            Namaste, {user?.name?.split(" ")[0]}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#1C1917] mt-1">
            Aapka Hisab aaj kya bol raha hai?
          </h1>
          <div className="mt-3">
            <DateFilter value={datePreset} onChange={(preset, custom) => {
              setDatePreset(preset);
              if (custom) setCustomRange(custom);
            }} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenSms(true)}
            data-testid="dashboard-sms-parse-btn"
            className="border-[#2A4F4F]/30 text-[#2A4F4F] hover:bg-[#2A4F4F]/5 rounded-full">
            <MessageSquare className="w-4 h-4 mr-1" /> SMS Parse
          </Button>
          <Button variant="outline" onClick={() => setOpenAcc(true)}
            data-testid="dashboard-add-account-btn"
            className="border-[#E7E5DF] rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Account
          </Button>
          <Button onClick={() => setOpenTxn(true)}
            data-testid="dashboard-add-transaction-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Transaction
          </Button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat testid="stat-balance" label="Total Balance" tone="primary" icon={Wallet} to="/accounts"
          value={summary ? formatMoney(summary.net_balance, cur) : "—"} />
        <Stat testid="stat-income" label="Aaya (Income)" tone="income" icon={TrendingUp} to="/transactions?type=income"
          value={summary ? formatMoney(summary.total_income, cur) : "—"} />
        <Stat testid="stat-expense" label="Gaya (Kharcha)" tone="expense" icon={TrendingDown} to="/transactions?type=expense"
          value={summary ? formatMoney(summary.total_expense, cur) : "—"} />
        <Stat testid="stat-udhaar" label="Udhaar Net" tone="warn" icon={Users} to="/udhaar"
          value={summary
            ? formatMoney((summary.udhaar_lene || 0) - (summary.udhaar_dene || 0), cur)
            : "—"} />
      </div>

      {/* Vibe / Meme */}
      {widgets.vibe && <VibeCard />}

      {/* Health + Streak + Net Worth */}
      {(widgets.health || widgets.streak || widgets.networth || widgets.emergency || widgets.badges) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {widgets.health && <div className="lg:col-span-2"><HealthScoreCard /></div>}
          {widgets.streak && <StreakCard />}
          {widgets.networth && <NetWorthCard />}
          {widgets.emergency && <EmergencyFundCard />}
          {widgets.badges && <BadgesCard />}
        </div>
      )}

      {/* Accounts + Recent */}
      {(widgets.recent || widgets.accounts) && (
      <div className={`grid gap-6 ${widgets.recent && widgets.accounts ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {widgets.recent && (
        <div className={`${widgets.accounts ? "lg:col-span-2" : ""} bg-white border border-[#E7E5DF] rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Recent Transactions</h2>
            <Link to="/transactions" data-testid="dashboard-see-all-transactions"
              className="text-xs font-semibold text-[#2A4F4F] hover:underline">See all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-[#78716C] py-10 text-center">
              Abhi tak koi transaction nahi. Upar se ek add karo!
            </div>
          ) : (
            <ul className="divide-y divide-[#E7E5DF]">
              {recent.map((t) => (
                <li key={t.id} data-testid={`recent-txn-${t.id}`}
                  className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      t.type === "income" ? "bg-[#4A7C59]/10 text-[#3B6446]" : "bg-[#D96C52]/10 text-[#B15039]"
                    }`}>
                      {t.type === "income"
                        ? <ArrowDownRight className="w-4 h-4" />
                        : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1C1917] truncate">
                        {t.category} <span className="text-[#A8A29E]">·</span>{" "}
                        <span className="text-[#78716C]">{t.account_name}</span>
                      </div>
                      {t.note && <div className="text-xs text-[#78716C] truncate">{t.note}</div>}
                    </div>
                  </div>
                  <div className={`font-heading font-semibold ${
                    t.type === "income" ? "text-[#3B6446]" : "text-[#B15039]"
                  }`}>
                    {t.type === "income" ? "+" : "−"} {formatMoney(t.amount, cur)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        {widgets.accounts && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Accounts</h2>
            <Link to="/accounts" data-testid="dashboard-see-all-accounts"
              className="text-xs font-semibold text-[#2A4F4F] hover:underline">Manage</Link>
          </div>
          {accounts.length === 0 ? (
            <div className="text-sm text-[#78716C] py-6 text-center">
              Koi account nahi. Add Account button click karo.
            </div>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li key={a.id} data-testid={`account-card-${a.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#F9F8F6] border border-[#E7E5DF]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md" style={{ background: a.color || "#2A4F4F" }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-[#A8A29E] uppercase tracking-wider">{a.type}</div>
                    </div>
                  </div>
                  <div className="font-heading font-semibold text-sm">{formatMoney(a.balance, a.currency || cur)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}
      </div>
      )}

      <AddTransactionDialog open={openTxn} onOpenChange={setOpenTxn}
        accounts={accounts} onDone={load} />
      <AddAccountDialog open={openAcc} onOpenChange={setOpenAcc} onDone={load} />
      <SmsParseDialog open={openSms} onOpenChange={setOpenSms} accounts={accounts} onDone={load} />
    </div>
  );
}
