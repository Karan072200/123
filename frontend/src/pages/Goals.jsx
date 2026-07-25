import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Target, TrendingUp, Trash2, PiggyBank } from "lucide-react";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["🎯", "🏠", "🚗", "📱", "💻", "✈️", "💍", "🎓", "👶", "💰", "🏖️", "🎁"];
const COLOR_OPTIONS = ["#4A7C59", "#2A4F4F", "#E8B365", "#D96C52", "#8B6220", "#3B6446"];

export default function Goals() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [openContrib, setOpenContrib] = useState(null); // goal object
  const [contribAmt, setContribAmt] = useState("");

  const [form, setForm] = useState({
    name: "", target_amount: "", saved_amount: "0", target_date: "",
    emoji: "🎯", color: "#4A7C59",
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/goals");
      setGoals(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createGoal = async () => {
    if (!form.name || !form.target_amount) {
      toast.error("Naam aur target amount zaroori hain");
      return;
    }
    try {
      await http.post("/goals", {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        saved_amount: parseFloat(form.saved_amount || 0),
        target_date: form.target_date || null,
        emoji: form.emoji,
        color: form.color,
      });
      toast.success("Goal add ho gaya! 🎯");
      setOpenNew(false);
      setForm({ name: "", target_amount: "", saved_amount: "0", target_date: "", emoji: "🎯", color: "#4A7C59" });
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const contribute = async () => {
    if (!contribAmt || parseFloat(contribAmt) <= 0) return;
    try {
      await http.post(`/goals/${openContrib.id}/contribute?amount=${contribAmt}`);
      toast.success(`₹${contribAmt} add ho gaya! 💰`);
      setOpenContrib(null);
      setContribAmt("");
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Goal delete karna hai?")) return;
    try {
      await http.delete(`/goals/${id}`);
      toast.success("Goal delete ho gaya");
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-8" data-testid="goals-page">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E]">
            Sapno ka Wallet
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#1C1917] mt-1">
            Financial Goals
          </h1>
          <p className="text-sm text-[#78716C] mt-2 max-w-lg">
            Apne sapne likh do — car, ghar, iPhone, ya vacation. Har mahine kuch bacha ke, sapne poore karo.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button data-testid="goals-add-btn" className="bg-[#2A4F4F] hover:bg-[#1a3838] text-white rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Naya Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Naya Financial Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Goal ka Naam</Label>
                <Input data-testid="goal-name-input" placeholder="e.g., iPhone 16 Pro"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target Amount</Label>
                  <Input data-testid="goal-target-input" type="number" placeholder="120000"
                    value={form.target_amount}
                    onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
                </div>
                <div>
                  <Label>Abhi tak bachaya</Label>
                  <Input type="number" placeholder="0" value={form.saved_amount}
                    onChange={(e) => setForm({ ...form, saved_amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Target Date (Optional)</Label>
                <Input type="date" value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
              </div>
              <div>
                <Label>Emoji</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOJI_OPTIONS.map((em) => (
                    <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition
                        ${form.emoji === em ? "bg-[#2A4F4F] ring-2 ring-[#E8B365]" : "bg-[#F2F0EA] hover:bg-[#E7E5DF]"}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-10 h-10 rounded-full transition
                        ${form.color === c ? "ring-2 ring-offset-2 ring-[#2A4F4F]" : ""}`} />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="goal-save-btn" onClick={createGoal}
                className="bg-[#2A4F4F] text-white">Save Goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <div className="text-[#78716C]">Loading…</div>}

      {!loading && goals.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E7E5DF]">
          <Target className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#57534E] font-medium">Abhi koi goal set nahi hai</p>
          <p className="text-sm text-[#78716C] mt-1">Apne pehle sapne ko wallet me add karo — abhi!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
          const remaining = Math.max(0, g.target_amount - g.saved_amount);
          const daysLeft = g.target_date
            ? Math.max(0, Math.ceil((new Date(g.target_date) - new Date()) / (1000 * 60 * 60 * 24)))
            : null;
          return (
            <div key={g.id} data-testid={`goal-card-${g.id}`}
              className="bg-white rounded-2xl border border-[#E7E5DF] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${g.color}20` }}>
                    {g.emoji}
                  </div>
                  <div>
                    <div className="font-heading font-bold text-[#1C1917]">{g.name}</div>
                    {daysLeft !== null && (
                      <div className="text-xs text-[#78716C]">
                        {daysLeft > 0 ? `${daysLeft} din baaki` : "⏰ Time up"}
                      </div>
                    )}
                  </div>
                </div>
                <button data-testid={`goal-delete-${g.id}`} onClick={() => deleteGoal(g.id)}
                  className="text-[#A8A29E] hover:text-[#D96C52] p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-heading text-2xl font-bold" style={{ color: g.color }}>
                    {formatMoney(g.saved_amount, currency)}
                  </span>
                  <span className="text-xs text-[#78716C]">/ {formatMoney(g.target_amount, currency)}</span>
                </div>
                <div className="h-2 bg-[#F2F0EA] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-semibold text-[#57534E]">{pct}% done</span>
                  <span className="text-xs text-[#78716C]">
                    {remaining > 0 ? `${formatMoney(remaining, currency)} baaki` : "🎉 Complete!"}
                  </span>
                </div>
              </div>

              <Button size="sm" onClick={() => setOpenContrib(g)}
                data-testid={`goal-contribute-${g.id}`}
                className="w-full bg-[#4A7C59] hover:bg-[#3B6446] text-white rounded-full">
                <PiggyBank className="w-4 h-4 mr-1" /> Paisa Add karo
              </Button>
            </div>
          );
        })}
      </div>

      {/* Contribute Dialog */}
      <Dialog open={!!openContrib} onOpenChange={(o) => !o && setOpenContrib(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openContrib?.emoji} {openContrib?.name} — Paisa Add Karo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Amount</Label>
            <Input data-testid="goal-contribute-input" type="number" placeholder="1000"
              value={contribAmt} onChange={(e) => setContribAmt(e.target.value)}
              autoFocus />
            <div className="text-xs text-[#78716C]">
              Current: {formatMoney(openContrib?.saved_amount || 0, currency)} /{" "}
              {formatMoney(openContrib?.target_amount || 0, currency)}
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="goal-contribute-save" onClick={contribute}
              className="bg-[#4A7C59] text-white">
              <TrendingUp className="w-4 h-4 mr-1" /> Add Karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
