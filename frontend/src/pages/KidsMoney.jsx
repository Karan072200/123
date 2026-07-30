import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Baby, Plus, Trash2, PiggyBank, ShoppingBag, Gift, TrendingUp } from "lucide-react";

const KID_EMOJIS = ["🧒", "👦", "👧", "🐣", "⭐", "🎈", "🚀", "🦄"];

export default function KidsMoney() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [kids, setKids] = useState([]);
  const [openKid, setOpenKid] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [selectedKid, setSelectedKid] = useState(null);
  const [entries, setEntries] = useState([]);
  const [kidForm, setKidForm] = useState({ name: "", emoji: "🧒", monthly_allowance: "", balance: "" });
  const [entryForm, setEntryForm] = useState({ type: "allowance", amount: "", note: "", category: "" });

  const load = async () => {
    const { data } = await http.get("/kids");
    setKids(data || []);
  };

  useEffect(() => { load(); }, []);

  const loadEntries = async (kid) => {
    setSelectedKid(kid);
    const { data } = await http.get(`/kids/${kid.id}/entries`);
    setEntries(data || []);
  };

  const saveKid = async () => {
    if (!kidForm.name) { toast.error("Bachche ka naam batao"); return; }
    try {
      await http.post("/kids", {
        name: kidForm.name,
        emoji: kidForm.emoji,
        monthly_allowance: Number(kidForm.monthly_allowance) || 0,
        balance: Number(kidForm.balance) || 0,
      });
      toast.success("Bachcha add ho gaya!");
      setOpenKid(false);
      setKidForm({ name: "", emoji: "🧒", monthly_allowance: "", balance: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const saveEntry = async () => {
    if (!selectedKid || !entryForm.amount) { toast.error("Amount daalo"); return; }
    try {
      await http.post("/kids/entry", {
        kid_id: selectedKid.id,
        type: entryForm.type,
        amount: Number(entryForm.amount),
        note: entryForm.note,
        category: entryForm.category,
      });
      toast.success("Entry save!");
      setOpenEntry(false);
      setEntryForm({ type: "allowance", amount: "", note: "", category: "" });
      await load();
      const updated = kids.find((k) => k.id === selectedKid.id);
      if (updated) loadEntries(updated);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const deleteKid = async (id) => {
    if (!window.confirm("Iss bachche ka data delete kar do?")) return;
    await http.delete(`/kids/${id}`);
    setSelectedKid(null);
    setEntries([]);
    load();
  };

  const openEntryFor = (kid, type) => {
    setSelectedKid(kid);
    setEntryForm({ type, amount: "", note: "", category: type === "spend" ? "Toys" : "" });
    setOpenEntry(true);
  };

  return (
    <div className="space-y-6" data-testid="kids-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Baby className="w-7 h-7 text-[#2A4F4F]" />
            Bachcho ki Pocket Money
          </h1>
          <p className="text-[#78716C] mt-1">Allowance, savings & kharche — bachcho ka apna khata</p>
        </div>
        <Dialog open={openKid} onOpenChange={setOpenKid}>
          <DialogTrigger asChild>
            <Button data-testid="add-kid-btn" className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              <Plus className="w-4 h-4 mr-1" /> Naya Bachcha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Naya Bachcha Add Karo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Naam</Label>
                <Input data-testid="kid-name" value={kidForm.name}
                  onChange={(e) => setKidForm({ ...kidForm, name: e.target.value })}
                  placeholder="e.g. Aarav" />
              </div>
              <div>
                <Label>Emoji</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {KID_EMOJIS.map((e) => (
                    <button key={e}
                      onClick={() => setKidForm({ ...kidForm, emoji: e })}
                      className={`text-2xl p-2 rounded-lg border-2 ${
                        kidForm.emoji === e ? "border-[#2A4F4F] bg-[#F2F0EA]" : "border-transparent hover:bg-[#F9F8F6]"
                      }`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monthly Allowance (₹)</Label>
                  <Input type="number" value={kidForm.monthly_allowance}
                    onChange={(e) => setKidForm({ ...kidForm, monthly_allowance: e.target.value })}
                    placeholder="500" />
                </div>
                <div>
                  <Label>Starting Balance (₹)</Label>
                  <Input type="number" value={kidForm.balance}
                    onChange={(e) => setKidForm({ ...kidForm, balance: e.target.value })}
                    placeholder="0" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenKid(false)}>Cancel</Button>
              <Button onClick={saveKid} data-testid="kid-save-btn" className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {kids.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <Baby className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#78716C]">Ek bhi bachcha add nahi kiya. "Naya Bachcha" dabao.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kids.map((k) => (
            <div key={k.id} data-testid={`kid-${k.id}`}
              className="bg-gradient-to-br from-[#F2F0EA] to-white border border-[#E7E5DF] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-5xl">{k.emoji || "🧒"}</div>
                  <div>
                    <div className="font-heading text-xl font-bold">{k.name}</div>
                    <div className="text-xs text-[#78716C]">Allowance: {formatMoney(k.monthly_allowance || 0, cur)}/mo</div>
                  </div>
                </div>
                <button onClick={() => deleteKid(k.id)} data-testid={`kid-delete-${k.id}`}
                  className="text-[#B15039] hover:bg-[#D96C52]/10 p-1.5 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 bg-white rounded-xl p-4 border border-[#E7E5DF]">
                <div className="text-xs uppercase text-[#78716C] font-semibold">Current Balance</div>
                <div className="font-heading text-3xl font-bold text-[#2A4F4F] mt-1">
                  {formatMoney(k.balance || 0, cur)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#78716C]">Total Saved:</span>
                    <span className="font-semibold text-[#3B6446] ml-1">{formatMoney(k.total_saved || 0, cur)}</span>
                  </div>
                  <div>
                    <span className="text-[#78716C]">Kharcha:</span>
                    <span className="font-semibold text-[#B15039] ml-1">{formatMoney(k.total_spent || 0, cur)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={() => openEntryFor(k, "allowance")}
                  data-testid={`kid-allowance-btn-${k.id}`}
                  className="text-xs border-[#3B6446] text-[#3B6446]">
                  <Gift className="w-3.5 h-3.5 mr-1" /> +Allowance
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEntryFor(k, "spend")}
                  data-testid={`kid-spend-btn-${k.id}`}
                  className="text-xs border-[#B15039] text-[#B15039]">
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Kharcha
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEntryFor(k, "save")}
                  data-testid={`kid-save-btn-${k.id}`}
                  className="text-xs border-[#B8763A] text-[#B8763A]">
                  <PiggyBank className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
              </div>

              <button onClick={() => loadEntries(k)}
                data-testid={`kid-view-history-${k.id}`}
                className="mt-3 w-full text-xs text-[#2A4F4F] hover:underline flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Full History
              </button>

              {selectedKid?.id === k.id && entries.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto space-y-1 border-t border-[#E7E5DF] pt-3">
                  {entries.map((en) => (
                    <div key={en.id} className="text-xs flex justify-between">
                      <span>
                        <span className={en.type === "allowance" ? "text-[#3B6446]" : en.type === "spend" ? "text-[#B15039]" : "text-[#B8763A]"}>
                          {en.type === "allowance" ? "+" : en.type === "spend" ? "-" : "★"}
                        </span>
                        {" "}{formatMoney(en.amount, cur)}
                        {en.note && <span className="text-[#78716C]"> · {en.note}</span>}
                      </span>
                      <span className="text-[#A8A29E]">{new Date(en.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={openEntry} onOpenChange={setOpenEntry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedKid?.emoji} {selectedKid?.name} — {" "}
              {entryForm.type === "allowance" ? "Allowance Do" : entryForm.type === "spend" ? "Kharcha" : "Savings"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" data-testid="kid-entry-amount" value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                placeholder="100" />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={entryForm.note}
                onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                placeholder={entryForm.type === "spend" ? "Chocolate, toy, etc." : "Details"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEntry(false)}>Cancel</Button>
            <Button onClick={saveEntry} data-testid="kid-entry-save-btn"
              className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
