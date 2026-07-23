import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddAccountDialog from "@/components/AddAccountDialog";
import SmsParseDialog from "@/components/SmsParseDialog";
import {
  TrendingUp, TrendingDown, Wallet, Users, ArrowUpRight, ArrowDownRight, Plus, MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";

const Stat = ({ label, value, icon: Icon, tone, testid }) => {
  const toneMap = {
    primary: "bg-[#2A4F4F] text-white",
    income: "bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/20",
    expense: "bg-[#D96C52]/10 text-[#B15039] border border-[#D96C52]/20",
    warn: "bg-[#E8B365]/15 text-[#8B6220] border border-[#E8B365]/25",
  };
  return (
    <div data-testid={testid} className={`rounded-xl p-5 soft-rise ${toneMap[tone] || toneMap.primary}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-80">{label}</span>
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="font-heading text-2xl md:text-3xl font-bold">{value}</div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [openTxn, setOpenTxn] = useState(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [openSms, setOpenSms] = useState(false);
  const cur = user?.currency || "INR";

  const load = async () => {
    // Auto-run recurring transactions first (safe to call repeatedly)
    try { await http.post("/recurring/run"); } catch (e) { console.warn("recurring/run failed:", e?.message); }
    const [s, a, t] = await Promise.all([
      http.get("/analytics/summary").then((r) => r.data),
      http.get("/accounts").then((r) => r.data),
      http.get("/transactions?limit=6").then((r) => r.data),
    ]);
    setSummary(s);
    setAccounts(a);
    setRecent(t.slice(0, 6));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E]">
            Namaste, {user?.name?.split(" ")[0]}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#1C1917] mt-1">
            Aapka Hisab aaj kya bol raha hai?
          </h1>
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
        <Stat testid="stat-balance" label="Total Balance" tone="primary" icon={Wallet}
          value={summary ? formatMoney(summary.net_balance, cur) : "—"} />
        <Stat testid="stat-income" label="Aaya (Income)" tone="income" icon={TrendingUp}
          value={summary ? formatMoney(summary.total_income, cur) : "—"} />
        <Stat testid="stat-expense" label="Gaya (Kharcha)" tone="expense" icon={TrendingDown}
          value={summary ? formatMoney(summary.total_expense, cur) : "—"} />
        <Stat testid="stat-udhaar" label="Udhaar Net" tone="warn" icon={Users}
          value={summary
            ? formatMoney((summary.udhaar_lene || 0) - (summary.udhaar_dene || 0), cur)
            : "—"} />
      </div>

      {/* Accounts + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E7E5DF] rounded-xl p-6">
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
      </div>

      <AddTransactionDialog open={openTxn} onOpenChange={setOpenTxn}
        accounts={accounts} onDone={load} />
      <AddAccountDialog open={openAcc} onOpenChange={setOpenAcc} onDone={load} />
      <SmsParseDialog open={openSms} onOpenChange={setOpenSms} accounts={accounts} onDone={load} />
    </div>
  );
}
