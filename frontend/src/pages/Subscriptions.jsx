import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, CreditCard, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const SUB_EMOJI = ["💳", "📺", "🎵", "☁️", "🎮", "📰", "🍔", "🏋️", "📚", "🎬"];
const SUB_PRESETS = [
  { name: "Netflix", emoji: "📺", color: "#D96C52", amount: 649 },
  { name: "Spotify", emoji: "🎵", color: "#4A7C59", amount: 119 },
  { name: "Amazon Prime", emoji: "📺", color: "#2A4F4F", amount: 1499 },
  { name: "YouTube Premium", emoji: "▶️", color: "#D96C52", amount: 149 },
  { name: "Hotstar", emoji: "📺", color: "#2A4F4F", amount: 899 },
  { name: "Gym", emoji: "🏋️", color: "#8B6220", amount: 1500 },
  { name: "ChatGPT", emoji: "🤖", color: "#4A7C59", amount: 1650 },
];

export default function Subscriptions() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [subs, setSubs] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", billing_cycle: "monthly",
    next_billing_date: "", emoji: "💳", color: "#D96C52", website: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/subscriptions");
      setSubs(data.subscriptions || []);
      setMonthlyTotal(data.monthly_total || 0);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const applyPreset = (p) => {
    setForm({ ...form, name: p.name, emoji: p.emoji, color: p.color, amount: String(p.amount) });
  };

  const createSub = async () => {
    if (!form.name || !form.amount) {
      toast.error("Naam aur amount zaroori");
      return;
    }
    try {
      await http.post("/subscriptions", {
        name: form.name,
        amount: parseFloat(form.amount),
        billing_cycle: form.billing_cycle,
        next_billing_date: form.next_billing_date || null,
        emoji: form.emoji,
        color: form.color,
        website: form.website || "",
        active: true,
        category: "Entertainment",
      });
      toast.success("Subscription add ho gayi! 💳");
      setOpen(false);
      setForm({ name: "", amount: "", billing_cycle: "monthly", next_billing_date: "", emoji: "💳", color: "#D96C52", website: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const removeSub = async (id) => {
    if (!window.confirm("Subscription delete karni hai?")) return;
    try {
      await http.delete(`/subscriptions/${id}`);
      toast.success("Delete ho gayi");
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const toggleActive = async (sub) => {
    try {
      await http.patch(`/subscriptions/${sub.id}`, { active: !sub.active });
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="space-y-8" data-testid="subscriptions-page">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E]">
            Monthly Chai-Pani
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#1C1917] mt-1">
            Subscriptions
          </h1>
          <p className="text-sm text-[#78716C] mt-2">
            Netflix, Spotify, gym — sab track karo. Jo use nahi karte, cancel karo.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="sub-add-btn" className="bg-[#2A4F4F] hover:bg-[#1a3838] text-white rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Naya
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Naya Subscription</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs">Quick Add (Popular)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUB_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => applyPreset(p)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F2F0EA] hover:bg-[#E7E5DF]
                                 border border-[#E7E5DF] transition">
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Service Naam</Label>
                <Input data-testid="sub-name-input" placeholder="e.g., Netflix, Gym"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input data-testid="sub-amount-input" type="number" placeholder="649"
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Billing Cycle</Label>
                  <Select value={form.billing_cycle}
                    onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (3 mahine)</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Next Billing Date (Optional)</Label>
                <Input type="date" value={form.next_billing_date}
                  onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} />
              </div>

              <div>
                <Label>Emoji</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUB_EMOJI.map((em) => (
                    <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition
                        ${form.emoji === em ? "bg-[#2A4F4F] ring-2 ring-[#E8B365]" : "bg-[#F2F0EA] hover:bg-[#E7E5DF]"}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="sub-save-btn" onClick={createSub}
                className="bg-[#2A4F4F] text-white">Save Subscription</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2A4F4F] text-white rounded-2xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-80">Monthly Bill</div>
          <div className="font-heading text-3xl font-bold mt-2">{formatMoney(monthlyTotal, currency)}</div>
          <div className="text-xs opacity-80 mt-1">Per month recurring</div>
        </div>
        <div className="bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-2xl p-5 text-[#B15039]">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-80">Yearly Cost</div>
          <div className="font-heading text-3xl font-bold mt-2">{formatMoney(yearlyTotal, currency)}</div>
          <div className="text-xs opacity-80 mt-1">Ek saal ka total</div>
        </div>
        <div className="bg-[#E8B365]/15 border border-[#E8B365]/25 rounded-2xl p-5 text-[#8B6220]">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-80">Active</div>
          <div className="font-heading text-3xl font-bold mt-2">{subs.filter(s => s.active).length}</div>
          <div className="text-xs opacity-80 mt-1">Chalu subscriptions</div>
        </div>
      </div>

      {loading && <div className="text-[#78716C]">Loading…</div>}

      {!loading && subs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E7E5DF]">
          <CreditCard className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#57534E] font-medium">Koi subscription nahi</p>
          <p className="text-sm text-[#78716C] mt-1">Netflix, Spotify jaise services add karo — track karne ke liye.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subs.map((s) => (
          <div key={s.id} data-testid={`sub-card-${s.id}`}
            className={`bg-white rounded-xl border p-4 flex items-center justify-between transition-all
              ${s.active ? "border-[#E7E5DF]" : "border-[#E7E5DF] opacity-50"}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${s.color}20` }}>
                {s.emoji}
              </div>
              <div>
                <div className="font-heading font-bold text-[#1C1917]">{s.name}</div>
                <div className="text-xs text-[#78716C]">
                  {s.billing_cycle} · {s.next_billing_date ? `Due ${s.next_billing_date}` : "No date set"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-heading font-bold" style={{ color: s.color }}>
                  {formatMoney(s.amount, currency)}
                </div>
                <button onClick={() => toggleActive(s)}
                  data-testid={`sub-toggle-${s.id}`}
                  className="text-xs text-[#78716C] hover:underline">
                  {s.active ? "Pause" : "Resume"}
                </button>
              </div>
              <button data-testid={`sub-delete-${s.id}`} onClick={() => removeSub(s.id)}
                className="text-[#A8A29E] hover:text-[#D96C52] p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
