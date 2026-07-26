import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, PiggyBank, LineChart, Landmark, Repeat, Boxes, CalendarClock } from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  mutual_fund: { label: "Mutual Fund", icon: LineChart, color: "#2A4F4F" },
  stock: { label: "Stock", icon: TrendingUp, color: "#3B6446" },
  sip: { label: "SIP", icon: Repeat, color: "#8B5CF6" },
  fd: { label: "Fixed Deposit", icon: Landmark, color: "#B45309" },
  rd: { label: "Recurring Deposit", icon: PiggyBank, color: "#0E7490" },
  other: { label: "Other", icon: Boxes, color: "#78716C" },
};

function AddInvestmentDialog({ open, onOpenChange, editing, onDone }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("mutual_fund");
  const [invested, setInvested] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [units, setUnits] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setType(editing.type);
        setInvested(String(editing.invested_amount));
        setCurrentValue(String(editing.current_value));
        setUnits(editing.units != null ? String(editing.units) : "");
        setPurchaseDate(editing.purchase_date || "");
        setMaturityDate(editing.maturity_date || "");
        setNotes(editing.notes || "");
      } else {
        setName(""); setType("mutual_fund"); setInvested(""); setCurrentValue("");
        setUnits(""); setPurchaseDate(""); setMaturityDate(""); setNotes("");
      }
    }
  }, [open, editing]);

  const showsMaturity = type === "fd" || type === "rd";
  const showsUnits = type === "mutual_fund" || type === "stock" || type === "sip";

  const submit = async () => {
    if (!name.trim()) return toast.error("Naam daalo");
    const inv = Number(invested);
    if (!inv || inv <= 0) return toast.error("Sahi invested amount daalo");
    const cur = currentValue === "" ? inv : Number(currentValue);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        invested_amount: inv,
        current_value: cur,
        units: units ? Number(units) : null,
        purchase_date: purchaseDate || undefined,
        maturity_date: maturityDate || undefined,
        notes,
      };
      if (editing) {
        await http.put(`/investments/${editing.id}`, payload);
        toast.success("Update ho gaya");
      } else {
        await http.post("/investments", payload);
        toast.success("Investment add ho gaya");
      }
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Nahi ho paya");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? "Investment Edit Karo" : "Naya Investment"}</DialogTitle>
          <DialogDescription>Mutual funds, stocks, FD/RD, SIP — sab yahan track karo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              data-testid="inv-name-input" className="mt-1.5" placeholder="e.g. Parag Parikh Flexi Cap" />
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="inv-type-select" className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Invested Amount</Label>
              <Input type="number" step="0.01" value={invested} onChange={(e) => setInvested(e.target.value)}
                data-testid="inv-invested-input" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Current Value</Label>
              <Input type="number" step="0.01" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)}
                data-testid="inv-current-input" className="mt-1.5" placeholder="Invested ke barabar" />
            </div>
          </div>

          {showsUnits && (
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Units / Shares (optional)</Label>
              <Input type="number" step="0.0001" value={units} onChange={(e) => setUnits(e.target.value)}
                data-testid="inv-units-input" className="mt-1.5" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
                data-testid="inv-purchase-date-input" className="mt-1.5" />
            </div>
            {showsMaturity && (
              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Maturity Date</Label>
                <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)}
                  data-testid="inv-maturity-date-input" className="mt-1.5" />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              data-testid="inv-notes-input" className="mt-1.5" rows={2} />
          </div>

          <Button onClick={submit} disabled={saving}
            data-testid="inv-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : editing ? "Update Karo" : "Save Karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Investments() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [r, s] = await Promise.all([
      http.get("/investments").then((r) => r.data),
      http.get("/investments/summary").then((r) => r.data),
    ]);
    setRows(r);
    setSummary(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (inv) => { setEditing(inv); setOpen(true); };

  const del = async (id) => {
    if (!confirm("Ye investment delete karna hai?")) return;
    await http.delete(`/investments/${id}`);
    toast.success("Delete ho gaya");
    load();
  };

  const daysToMaturity = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) return <div className="text-sm text-[#78716C] p-8">Load ho raha hai…</div>;

  const gainPositive = (summary?.total_gain || 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Investments</h1>
          <p className="text-sm text-[#57534E] mt-1">Mutual funds, stocks, FD/RD, SIP — sab ek jagah.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}
          data-testid="inv-add-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Naya Investment
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Total Invested</div>
          <div className="font-heading text-2xl font-bold text-[#1C1917] mt-1">{formatMoney(summary?.total_invested, cur)}</div>
        </div>
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Current Value</div>
          <div className="font-heading text-2xl font-bold text-[#1C1917] mt-1">{formatMoney(summary?.total_current_value, cur)}</div>
        </div>
        <div className={`rounded-xl p-5 border ${gainPositive ? "bg-[#4A7C59]/10 border-[#4A7C59]/20" : "bg-[#D96C52]/10 border-[#D96C52]/20"}`}>
          <div className={`text-xs font-semibold tracking-widest uppercase ${gainPositive ? "text-[#3B6446]" : "text-[#B15039]"}`}>
            Total {gainPositive ? "Gain" : "Loss"}
          </div>
          <div className={`font-heading text-2xl font-bold mt-1 flex items-center gap-1 ${gainPositive ? "text-[#3B6446]" : "text-[#B15039]"}`}>
            {gainPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {formatMoney(Math.abs(summary?.total_gain || 0), cur)}
            <span className="text-sm font-semibold">({summary?.gain_percent ?? 0}%)</span>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-[#78716C] bg-white border border-[#E7E5DF] rounded-xl p-10 text-center">
          <LineChart className="w-8 h-8 mx-auto mb-2 text-[#A8A29E]" />
          Abhi koi investment add nahi ki. Pehla investment add karo! 📈
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((inv) => {
            const meta = TYPE_META[inv.type] || TYPE_META.other;
            const Icon = meta.icon;
            const gain = inv.current_value - inv.invested_amount;
            const gainPct = inv.invested_amount > 0 ? ((gain / inv.invested_amount) * 100).toFixed(1) : "0.0";
            const isGain = gain >= 0;
            const mDays = daysToMaturity(inv.maturity_date);

            return (
              <div key={inv.id} data-testid={`inv-card-${inv.id}`}
                className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${meta.color}1A` }}>
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <div className="font-heading text-base font-semibold text-[#1C1917]">{inv.name}</div>
                      <Badge className="mt-1 text-xs" style={{
                        backgroundColor: `${meta.color}1A`, color: meta.color, border: `1px solid ${meta.color}4D`,
                      }}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(inv)}
                      data-testid={`inv-edit-${inv.id}`}
                      className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#2A4F4F] hover:bg-[#2A4F4F]/10 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(inv.id)}
                      data-testid={`inv-delete-${inv.id}`}
                      className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-[#78716C]">Invested</div>
                    <div className="font-semibold text-[#1C1917]">{formatMoney(inv.invested_amount, cur)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#78716C]">Current Value</div>
                    <div className="font-semibold text-[#1C1917]">{formatMoney(inv.current_value, cur)}</div>
                  </div>
                </div>

                <div className={`text-sm font-semibold flex items-center gap-1 ${isGain ? "text-[#3B6446]" : "text-[#B15039]"}`}>
                  {isGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isGain ? "+" : ""}{formatMoney(gain, cur)} ({gainPct}%)
                </div>

                {(inv.units || inv.purchase_date || inv.maturity_date) && (
                  <div className="flex flex-wrap gap-3 text-xs text-[#78716C] border-t border-[#F2F0EA] pt-2">
                    {inv.units && <span>{inv.units} units</span>}
                    {inv.purchase_date && <span>Purchased: {inv.purchase_date}</span>}
                    {inv.maturity_date && (
                      <span className="flex items-center gap-1 text-[#B45309]">
                        <CalendarClock className="w-3 h-3" />
                        Matures: {inv.maturity_date}
                        {mDays != null && mDays >= 0 && mDays <= 30 && ` (${mDays} din mein!)`}
                      </span>
                    )}
                  </div>
                )}

                {inv.notes && <div className="text-sm text-[#57534E]">{inv.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      <AddInvestmentDialog open={open} onOpenChange={setOpen} editing={editing} onDone={load} />
    </div>
  );
}
