import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import AddAccountDialog from "@/components/AddAccountDialog";
import { Plus, Trash2, Landmark } from "lucide-react";
import { toast } from "sonner";

export default function Accounts() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const r = await http.get("/accounts").then((r) => r.data);
    setAccounts(r);
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm("Account aur uske transactions delete honge. Continue?")) return;
    await http.delete(`/accounts/${id}`);
    toast.success("Account delete ho gaya");
    load();
  };

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Accounts</h1>
          <p className="text-sm text-[#57534E] mt-1">Aapke saare accounts ek jagah.</p>
        </div>
        <Button onClick={() => setOpen(true)}
          data-testid="accounts-add-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Add Account
        </Button>
      </div>

      <div className="bg-gradient-to-br from-[#2A4F4F] to-[#1F3B3B] rounded-xl p-6 text-white">
        <div className="text-xs font-semibold tracking-widest uppercase opacity-70">Total across all accounts</div>
        <div className="font-heading text-4xl font-bold mt-1">{formatMoney(total, cur)}</div>
        <div className="text-sm opacity-80 mt-2">{accounts.length} account{accounts.length === 1 ? "" : "s"}</div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-12 text-center">
          <Landmark className="w-10 h-10 text-[#A8A29E] mx-auto mb-3" />
          <div className="font-heading text-lg font-semibold">Koi account nahi</div>
          <div className="text-sm text-[#78716C] mt-1 mb-4">Pehla account add karo — Savings, Current, Cash — kuch bhi.</div>
          <Button onClick={() => setOpen(true)}
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} data-testid={`accounts-card-${a.id}`}
              className="bg-white border border-[#E7E5DF] rounded-xl p-5 hover:-translate-y-0.5 transition-transform">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg" style={{ background: a.color || "#2A4F4F" }} />
                <button onClick={() => del(a.id)}
                  data-testid={`accounts-delete-${a.id}`}
                  className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest text-[#A8A29E] font-semibold">{a.type}</div>
                <div className="font-heading text-lg font-semibold text-[#1C1917] mt-0.5">{a.name}</div>
              </div>
              <div className="mt-3">
                <div className="font-heading text-2xl font-bold text-[#2A4F4F]">
                  {formatMoney(a.balance, a.currency || cur)}
                </div>
                <div className="text-xs text-[#78716C]">Opening: {formatMoney(a.opening_balance, a.currency || cur)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAccountDialog open={open} onOpenChange={setOpen} onDone={load} />
    </div>
  );
}
