import React, { useEffect, useState } from "react";
import { http, formatMoney, CATEGORIES } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function AddBudgetDialog({ open, onOpenChange, onDone, existing }) {
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(existing?.category || CATEGORIES.expense[0]);
      setAmount(existing ? String(existing.amount) : "");
    }
  }, [open, existing]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Sahi amount");
    setSaving(true);
    try {
      await http.post("/budgets", { category, amount: Number(amount) });
      toast.success("Budget set ho gaya!");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nahi ho paya");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{existing ? "Edit Budget" : "Naya Budget"}</DialogTitle>
          <DialogDescription>Category pe monthly limit set karo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!existing}>
              <SelectTrigger className="mt-1.5" data-testid="budget-category-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.expense.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Monthly Limit</Label>
            <Input type="number" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="budget-amount-input"
              className="mt-1.5" placeholder="e.g. 8000" />
          </div>
          <Button onClick={submit} disabled={saving}
            data-testid="budget-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : "Save karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Budgets() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const r = await http.get("/budgets").then((r) => r.data);
    setRows(r);
  };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!window.confirm("Delete karna hai?")) return;
    await http.delete(`/budgets/${id}`);
    load();
  };

  const startEdit = (b) => { setEditing(b); setOpen(true); };

  const totalBudget = rows.reduce((s, r) => s + r.amount, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const barColor = (pct) => {
    if (pct >= 100) return "bg-[#D96C52]";
    if (pct >= 80) return "bg-[#E8B365]";
    return "bg-[#4A7C59]";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Budget Goals</h1>
          <p className="text-sm text-[#57534E] mt-1">Category-wise monthly limit set karo, kharcha control karo.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}
          data-testid="budget-add-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Add Budget
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="bg-gradient-to-br from-[#2A4F4F] to-[#1F3B3B] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase opacity-70">This Month</div>
              <div className="font-heading text-3xl font-bold mt-1">
                {formatMoney(totalSpent, cur)} <span className="text-lg opacity-70">/ {formatMoney(totalBudget, cur)}</span>
              </div>
              <div className="text-sm opacity-80 mt-1">{overallPct.toFixed(0)}% used</div>
            </div>
            <Target className="w-10 h-10 opacity-40" />
          </div>
          <div className="mt-4 h-2 bg-white/15 rounded-full overflow-hidden">
            <div className={barColor(overallPct)} style={{ width: `${Math.min(overallPct, 100)}%`, height: "100%", transition: "width 400ms" }} />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-12 text-center">
          <Target className="w-10 h-10 text-[#A8A29E] mx-auto mb-3" />
          <div className="font-heading text-lg font-semibold">Koi budget nahi</div>
          <div className="text-sm text-[#78716C] mt-1 mb-4">Category pe limit lagao — bachat automatic hogi.</div>
          <Button onClick={() => setOpen(true)}
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Pehla Budget
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((b) => {
            const pct = b.percent;
            const isOver = pct >= 100;
            const isWarn = pct >= 80 && !isOver;
            return (
              <div key={b.id} data-testid={`budget-card-${b.id}`}
                className="bg-white border border-[#E7E5DF] rounded-xl p-5 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#A8A29E] font-semibold">Category</div>
                    <div className="font-heading text-lg font-semibold text-[#1C1917] mt-0.5">{b.category}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(b)}
                      data-testid={`budget-edit-${b.id}`}
                      className="text-xs font-semibold text-[#2A4F4F] hover:underline px-2">Edit</button>
                    <button onClick={() => del(b.id)}
                      data-testid={`budget-delete-${b.id}`}
                      className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="font-heading text-2xl font-bold text-[#1C1917]">
                    {formatMoney(b.spent, cur)}
                  </div>
                  <div className="text-sm text-[#78716C]">
                    of {formatMoney(b.amount, cur)}
                  </div>
                </div>
                <div className="mt-2 h-2 bg-[#F2F0EA] rounded-full overflow-hidden">
                  <div className={barColor(pct)} style={{ width: `${Math.min(pct, 100)}%`, height: "100%", transition: "width 400ms" }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-1 font-semibold ${
                    isOver ? "text-[#B15039]" : isWarn ? "text-[#8B6220]" : "text-[#3B6446]"
                  }`}>
                    {isOver
                      ? <><AlertTriangle className="w-3 h-3" /> Over budget!</>
                      : isWarn
                        ? <><AlertTriangle className="w-3 h-3" /> {pct.toFixed(0)}% used</>
                        : <><CheckCircle2 className="w-3 h-3" /> {pct.toFixed(0)}% used</>}
                  </span>
                  <span className="text-[#78716C]">
                    {b.remaining >= 0
                      ? `${formatMoney(b.remaining, cur)} left`
                      : `${formatMoney(Math.abs(b.remaining), cur)} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddBudgetDialog open={open} onOpenChange={setOpen} existing={editing} onDone={load} />
    </div>
  );
}
