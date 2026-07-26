import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Users2, Split, UserPlus } from "lucide-react";
import { toast } from "sonner";

function AddSplitDialog({ open, onOpenChange, onDone }) {
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidBy, setPaidBy] = useState("You");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState([{ name: "", share_amount: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(""); setTotalAmount(""); setPaidBy("You"); setDate(""); setNotes("");
      setParticipants([{ name: "", share_amount: "" }]);
    }
  }, [open]);

  const addParticipant = () => setParticipants((p) => [...p, { name: "", share_amount: "" }]);
  const removeParticipant = (i) => setParticipants((p) => p.filter((_, idx) => idx !== i));
  const updateParticipant = (i, field, value) =>
    setParticipants((p) => p.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const splitEqually = () => {
    const amt = Number(totalAmount);
    if (!amt || amt <= 0) return toast.error("Pehle total amount daalo");
    const validRows = participants.filter((p) => p.name.trim());
    if (validRows.length === 0) return toast.error("Kam se kam ek participant ka naam daalo");
    const each = (amt / validRows.length).toFixed(2);
    setParticipants(participants.map((p) => (p.name.trim() ? { ...p, share_amount: each } : p)));
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title daalo");
    const amt = Number(totalAmount);
    if (!amt || amt <= 0) return toast.error("Sahi total amount daalo");
    const cleanParticipants = participants
      .filter((p) => p.name.trim() && Number(p.share_amount) > 0)
      .map((p) => ({ name: p.name.trim(), share_amount: Number(p.share_amount), settled: false }));
    if (cleanParticipants.length === 0) return toast.error("Kam se kam ek participant ka naam aur share amount daalo");

    setSaving(true);
    try {
      await http.post("/splits", {
        title: title.trim(),
        total_amount: amt,
        paid_by: paidBy.trim() || "You",
        participants: cleanParticipants,
        date: date || undefined,
        notes,
      });
      toast.success("Split ban gaya!");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Nahi ho paya");
    } finally {
      setSaving(false);
    }
  };

  const participantsTotal = participants.reduce((s, p) => s + (Number(p.share_amount) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Naya Bill Split</DialogTitle>
          <DialogDescription>Dosto ke saath kharcha split karo, hisab clean rakho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Kis liye hai</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              data-testid="split-title-input" className="mt-1.5" placeholder="e.g. Goa Trip Dinner" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Total Amount</Label>
              <Input type="number" step="0.01" value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                data-testid="split-total-input" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Kisne Pay Kiya</Label>
              <Input value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                data-testid="split-paidby-input" className="mt-1.5" placeholder="You" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Date (optional)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              data-testid="split-date-input" className="mt-1.5" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Kis kis ke beech split</Label>
            <Button type="button" size="sm" variant="outline" onClick={splitEqually}
              data-testid="split-equally-btn" className="border-[#E7E5DF] rounded-full h-7 text-xs">
              Equally Split Karo
            </Button>
          </div>

          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p.name} onChange={(e) => updateParticipant(i, "name", e.target.value)}
                  data-testid={`split-participant-name-${i}`} placeholder="Naam" className="flex-1" />
                <Input type="number" step="0.01" value={p.share_amount}
                  onChange={(e) => updateParticipant(i, "share_amount", e.target.value)}
                  data-testid={`split-participant-amount-${i}`} placeholder="Share ₹" className="w-28" />
                <button type="button" onClick={() => removeParticipant(i)}
                  data-testid={`split-participant-remove-${i}`}
                  className="p-2 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addParticipant}
              data-testid="split-add-participant-btn"
              className="border-dashed border-[#E7E5DF] rounded-full text-[#57534E]">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Aur Participant Jodo
            </Button>
          </div>

          {totalAmount && (
            <div className={`text-xs rounded-lg px-3 py-2 ${
              Math.abs(participantsTotal - Number(totalAmount)) < 0.01
                ? "bg-[#4A7C59]/10 text-[#3B6446]"
                : "bg-[#D96C52]/10 text-[#B15039]"
            }`}>
              Shares total: {formatMoney(participantsTotal)} / Bill total: {formatMoney(Number(totalAmount) || 0)}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              data-testid="split-notes-input" className="mt-1.5" rows={2} />
          </div>

          <Button onClick={submit} disabled={saving}
            data-testid="split-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : "Split Save Karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Splits() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const myName = "You";
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await http.get("/splits").then((r) => r.data);
      setRows(r);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const settleParticipant = async (splitId, index) => {
    try {
      await http.patch(`/splits/${splitId}/settle/${index}`);
      toast.success("Settle ho gaya!");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Nahi ho paya");
    }
  };

  const del = async (id) => {
    if (!confirm("Ye split delete karna hai?")) return;
    await http.delete(`/splits/${id}`);
    toast.success("Delete ho gaya");
    load();
  };

  // "You" are owed: splits where you paid, sum of unsettled participant shares
  const youAreOwed = rows
    .filter((s) => (s.paid_by || "You").trim().toLowerCase() === "you")
    .reduce((sum, s) => sum + (s.participants || []).filter((p) => !p.settled).reduce((a, p) => a + p.share_amount, 0), 0);

  // "You" owe: splits where someone else paid, and you're a participant, unsettled
  const youOwe = rows
    .filter((s) => (s.paid_by || "You").trim().toLowerCase() !== "you")
    .reduce((sum, s) => {
      const mine = (s.participants || []).find((p) => p.name.trim().toLowerCase() === "you" && !p.settled);
      return sum + (mine ? mine.share_amount : 0);
    }, 0);

  const remind = (split, participant) => {
    const msg = `Namaste ${participant.name}, "${split.title}" ke ${formatMoney(participant.share_amount, cur)} baaki hain. Please settle kar do — Apka Munim`;
    navigator.clipboard?.writeText(msg);
    toast.success("Reminder message clipboard mein copy ho gaya");
  };

  if (loading) return <div className="text-sm text-[#78716C] p-8">Load ho raha hai…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Bill Splits</h1>
          <p className="text-sm text-[#57534E] mt-1">Dosto ke saath kharcha split karo, kisko kitna dena/lena hai track karo.</p>
        </div>
        <Button onClick={() => setOpen(true)}
          data-testid="split-add-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Naya Split
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#3B6446]">Aapko Lena Hai</div>
          <div className="font-heading text-3xl font-bold text-[#3B6446] mt-1">{formatMoney(youAreOwed, cur)}</div>
          <div className="text-sm text-[#3B6446]/80 mt-1">dosto se</div>
        </div>
        <div className="bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#B15039]">Aapko Dena Hai</div>
          <div className="font-heading text-3xl font-bold text-[#B15039] mt-1">{formatMoney(youOwe, cur)}</div>
          <div className="text-sm text-[#B15039]/80 mt-1">dosto ko</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-[#78716C] bg-white border border-[#E7E5DF] rounded-xl p-10 text-center">
          <Split className="w-8 h-8 mx-auto mb-2 text-[#A8A29E]" />
          Abhi koi split nahi hai. Pehla bill split karo! 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => {
            const allSettled = (s.participants || []).every((p) => p.settled);
            return (
              <div key={s.id} data-testid={`split-card-${s.id}`}
                className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-heading text-lg font-semibold text-[#1C1917]">{s.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#78716C]">
                      <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> Paid by {s.paid_by}</span>
                      {s.date && <span>· {s.date}</span>}
                      {allSettled && (
                        <Badge className="bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/30">Fully Settled</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-heading text-xl font-bold text-[#1C1917]">{formatMoney(s.total_amount, cur)}</div>
                    <button onClick={() => del(s.id)}
                      data-testid={`split-delete-${s.id}`}
                      className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {s.notes && <div className="text-sm text-[#57534E]">{s.notes}</div>}

                <div className="divide-y divide-[#F2F0EA] border-t border-[#F2F0EA]">
                  {(s.participants || []).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium text-[#1C1917]">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={p.settled ? "text-[#A8A29E] line-through" : "text-[#57534E]"}>
                          {formatMoney(p.share_amount, cur)}
                        </span>
                        {p.settled ? (
                          <Badge className="bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/30">Settled</Badge>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => remind(s, p)}
                              data-testid={`split-remind-${s.id}-${i}`}
                              className="h-7 text-xs border-[#E7E5DF] rounded-full">
                              Remind
                            </Button>
                            <Button size="sm" onClick={() => settleParticipant(s.id, i)}
                              data-testid={`split-settle-${s.id}-${i}`}
                              className="h-7 text-xs bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Settle
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSplitDialog open={open} onOpenChange={setOpen} onDone={load} />
    </div>
  );
}
