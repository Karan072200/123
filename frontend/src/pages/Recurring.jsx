import React, { useEffect, useState } from "react";
import { http, formatMoney, CATEGORIES } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Play, RefreshCw, Repeat } from "lucide-react";
import { toast } from "sonner";

const FREQ = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function AddRecurringDialog({ open, onOpenChange, accounts, onDone }) {
  const [type, setType] = useState("expense");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Rent");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("expense"); setAmount(""); setNote("");
      setCategory(CATEGORIES.expense[0]);
      setFrequency("monthly"); setDayOfMonth("1");
      setAccountId(accounts?.[0]?.id || "");
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, accounts]);

  useEffect(() => { setCategory(CATEGORIES[type][0]); }, [type]);

  const submit = async () => {
    if (!accountId) return toast.error("Account choose karo");
    if (!amount || Number(amount) <= 0) return toast.error("Sahi amount");
    setSaving(true);
    try {
      await http.post("/recurring", {
        account_id: accountId, type, amount: Number(amount), category, note,
        frequency,
        day_of_month: frequency === "monthly" ? Number(dayOfMonth) : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        active: true,
      });
      toast.success("Recurring rule ban gaya!");
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
          <DialogTitle className="font-heading">Naya Recurring</DialogTitle>
          <DialogDescription>Auto-add karo rent, salary, EMI jaisi cheezein.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5" data-testid="rec-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Kharcha</SelectItem>
                <SelectItem value="income">Aaya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Amount</Label>
              <Input type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="rec-amount-input" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1.5" data-testid="rec-freq-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQ.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1.5" data-testid="rec-account-select"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5" data-testid="rec-category-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES[type].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                data-testid="rec-start-input" className="mt-1.5" />
            </div>
            {frequency === "monthly" && (
              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Day of month</Label>
                <Input type="number" min="1" max="28" value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  data-testid="rec-day-input" className="mt-1.5" />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              data-testid="rec-note-input" className="mt-1.5" placeholder="e.g. HDFC EMI" />
          </div>

          <Button onClick={submit} disabled={saving}
            data-testid="rec-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : "Save karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Recurring() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const [r, a] = await Promise.all([
      http.get("/recurring").then((r) => r.data),
      http.get("/accounts").then((r) => r.data),
    ]);
    setRows(r);
    setAccounts(a);
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data } = await http.post("/recurring/run");
      toast.success(`${data.created} transaction${data.created === 1 ? "" : "s"} auto-add hue`);
      load();
    } finally { setRunning(false); }
  };

  const toggle = async (r) => {
    await http.patch(`/recurring/${r.id}`, { active: !r.active });
    load();
  };

  const del = async (id) => {
    if (!window.confirm("Delete karna hai?")) return;
    await http.delete(`/recurring/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Recurring</h1>
          <p className="text-sm text-[#57534E] mt-1">Rent, EMI, salary, subscriptions — auto add ho jayen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runNow} disabled={running}
            data-testid="rec-run-btn"
            className="border-[#E7E5DF] rounded-full">
            <RefreshCw className={`w-4 h-4 mr-1 ${running ? "animate-spin" : ""}`} /> Run now
          </Button>
          <Button onClick={() => setOpen(true)}
            data-testid="rec-add-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add Recurring
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-12 text-center">
          <Repeat className="w-10 h-10 text-[#A8A29E] mx-auto mb-3" />
          <div className="font-heading text-lg font-semibold">Koi recurring rule nahi</div>
          <div className="text-sm text-[#78716C] mt-1 mb-4">Rent ya salary jaisi cheezein setup karo — har mahine auto-add ho jayengi.</div>
          <Button onClick={() => setOpen(true)}
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Pehla Recurring
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.id} data-testid={`rec-card-${r.id}`}
              className="bg-white border border-[#E7E5DF] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      r.type === "income"
                        ? "bg-[#4A7C59]/10 text-[#3B6446]"
                        : "bg-[#D96C52]/10 text-[#B15039]"
                    }`}>
                      {r.type === "income" ? "Aaya" : "Kharcha"}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-[#A8A29E]">{r.frequency}</span>
                  </div>
                  <div className="font-heading text-lg font-semibold text-[#1C1917] mt-1">
                    {r.category} · {r.account_name}
                  </div>
                  {r.note && <div className="text-sm text-[#78716C]">{r.note}</div>}
                  <div className="text-xs text-[#A8A29E] mt-1">
                    Next: {new Date(r.next_due).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    {r.frequency === "monthly" && r.day_of_month && ` · Day ${r.day_of_month}`}
                  </div>
                </div>
                <div className={`font-heading text-xl font-bold ${
                  r.type === "income" ? "text-[#3B6446]" : "text-[#B15039]"
                }`}>
                  {formatMoney(r.amount, cur)}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E7E5DF]">
                <div className="flex items-center gap-2">
                  <Switch checked={r.active} onCheckedChange={() => toggle(r)}
                    data-testid={`rec-toggle-${r.id}`} />
                  <span className="text-xs text-[#57534E]">{r.active ? "Active" : "Paused"}</span>
                </div>
                <button onClick={() => del(r.id)}
                  data-testid={`rec-delete-${r.id}`}
                  className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddRecurringDialog open={open} onOpenChange={setOpen} accounts={accounts} onDone={load} />
    </div>
  );
}
