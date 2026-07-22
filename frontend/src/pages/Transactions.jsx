import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import SmsParseDialog from "@/components/SmsParseDialog";
import { Trash2, Plus, ArrowUpRight, ArrowDownRight, Pencil, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Transactions() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [txns, setTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [openSms, setOpenSms] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accFilter, setAccFilter] = useState("all");

  const load = async () => {
    const [t, a] = await Promise.all([
      http.get("/transactions").then((r) => r.data),
      http.get("/accounts").then((r) => r.data),
    ]);
    setTxns(t);
    setAccounts(a);
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!window.confirm("Delete karna hai?")) return;
    await http.delete(`/transactions/${id}`);
    toast.success("Delete ho gaya");
    load();
  };

  const startEdit = (t) => {
    setEditing(t);
    setOpen(true);
  };

  const filtered = txns.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (accFilter !== "all" && t.account_id !== accFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!(`${t.category} ${t.note} ${t.account_name}`.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Transactions</h1>
          <p className="text-sm text-[#57534E] mt-1">Aapke saare aaye aur gaye paise.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenSms(true)}
            data-testid="txn-page-sms-btn"
            className="border-[#2A4F4F]/30 text-[#2A4F4F] hover:bg-[#2A4F4F]/5 rounded-full">
            <MessageSquare className="w-4 h-4 mr-1" /> SMS Parse
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}
            data-testid="txn-page-add-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add Transaction
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 grid md:grid-cols-3 gap-3">
        <Input placeholder="Search category, note, account…" value={q}
          data-testid="txn-search-input"
          onChange={(e) => setQ(e.target.value)} />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger data-testid="txn-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sabhi types</SelectItem>
            <SelectItem value="income">Aaya (Income)</SelectItem>
            <SelectItem value="expense">Gaya (Kharcha)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accFilter} onValueChange={setAccFilter}>
          <SelectTrigger data-testid="txn-account-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sabhi accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-sm text-[#78716C] py-16 text-center">
            Koi transaction nahi mila.
          </div>
        ) : (
          <ul className="divide-y divide-[#E7E5DF]">
            {filtered.map((t) => (
              <li key={t.id} data-testid={`txn-row-${t.id}`}
                className="flex items-center justify-between p-4 hover:bg-[#F9F8F6] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    t.type === "income" ? "bg-[#4A7C59]/10 text-[#3B6446]" : "bg-[#D96C52]/10 text-[#B15039]"
                  }`}>
                    {t.type === "income"
                      ? <ArrowDownRight className="w-5 h-5" />
                      : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1917]">
                      {t.category} <span className="text-[#A8A29E]">·</span>{" "}
                      <span className="text-[#78716C]">{t.account_name}</span>
                    </div>
                    <div className="text-xs text-[#78716C]">
                      {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {t.note && <> · {t.note}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`font-heading font-semibold ${
                    t.type === "income" ? "text-[#3B6446]" : "text-[#B15039]"
                  }`}>
                    {t.type === "income" ? "+" : "−"} {formatMoney(t.amount, cur)}
                  </div>
                  <button onClick={() => startEdit(t)}
                    data-testid={`txn-edit-${t.id}`}
                    className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#2A4F4F] hover:bg-[#2A4F4F]/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => del(t.id)}
                    data-testid={`txn-delete-${t.id}`}
                    className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddTransactionDialog open={open} onOpenChange={setOpen}
        accounts={accounts} existing={editing} onDone={load} />
      <SmsParseDialog open={openSms} onOpenChange={setOpenSms} accounts={accounts} onDone={load} />
    </div>
  );
}
