import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Bell, Phone } from "lucide-react";
import { toast } from "sonner";

function AddUdhaarDialog({ open, onOpenChange, onDone }) {
  const [type, setType] = useState("lene");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setType("lene"); setName(""); setPhone(""); setAmount(""); setNote(""); setDueDate(""); }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Naam daalo");
    if (!amount || Number(amount) <= 0) return toast.error("Sahi amount");
    setSaving(true);
    try {
      await http.post("/udhaar", {
        person_name: name.trim(), phone, type, amount: Number(amount), note, due_date: dueDate,
      });
      toast.success("Udhaar record ho gaya");
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
          <DialogTitle className="font-heading">Naya Udhaar</DialogTitle>
          <DialogDescription>Kisse lena hai ya kisko dena hai?</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={setType}>
          <TabsList className="grid grid-cols-2 w-full bg-[#F2F0EA]">
            <TabsTrigger value="lene" data-testid="udhaar-type-lene"
              className="data-[state=active]:bg-[#4A7C59] data-[state=active]:text-white">
              Paise Lene Hain
            </TabsTrigger>
            <TabsTrigger value="dene" data-testid="udhaar-type-dene"
              className="data-[state=active]:bg-[#D96C52] data-[state=active]:text-white">
              Paise Dene Hain
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Person Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              data-testid="udhaar-name-input" className="mt-1.5" placeholder="e.g. Rahul" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Amount</Label>
              <Input type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="udhaar-amount-input" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Phone (opt.)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                data-testid="udhaar-phone-input" className="mt-1.5" placeholder="+91…" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              data-testid="udhaar-due-input" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              data-testid="udhaar-note-input" className="mt-1.5" rows={2} />
          </div>
          <Button onClick={submit} disabled={saving}
            data-testid="udhaar-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : "Save karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Udhaar() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const r = await http.get("/udhaar").then((r) => r.data);
    setRows(r);
  };
  useEffect(() => { load(); }, []);

  const settle = async (u) => {
    await http.patch(`/udhaar/${u.id}`, { status: "settled" });
    toast.success("Settle ho gaya!");
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete karna hai?")) return;
    await http.delete(`/udhaar/${id}`);
    toast.success("Delete ho gaya");
    load();
  };

  const remind = (u) => {
    const msg = `Namaste ${u.person_name}, aapse ₹${u.amount} lena/dena baaki hai. Please settle karo. — Apka Munim`;
    if (u.phone) {
      const url = `https://wa.me/${u.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    } else {
      navigator.clipboard?.writeText(msg);
      toast.success("Reminder message clipboard mein copy ho gaya");
    }
  };

  const remindAll = async () => {
    const pending = [...lene, ...dene].filter((u) => u.phone);
    if (pending.length === 0) {
      toast.error("Kisi bhi pending udhaar mein phone number nahi hai");
      return;
    }
    if (!window.confirm(`${pending.length} logon ko WhatsApp reminder bhejein? Har ek naya tab kholega.`)) return;
    let opened = 0;
    for (const u of pending) {
      const isLene = u.type === "lene";
      const msg = isLene
        ? `Namaste ${u.person_name}, aapse ₹${u.amount} lena baaki hai. Kripya jald settle kariye. — Apka Munim`
        : `Namaste ${u.person_name}, aapko ₹${u.amount} dena baaki hai. — Apka Munim`;
      const url = `https://wa.me/${u.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) opened += 1;
      // Small delay so browsers don't block subsequent tabs
      await new Promise((r) => setTimeout(r, 350));
    }
    toast.success(`${opened} reminders opened. Har tab mein Send dabao.`);
  };

  const lene = rows.filter((r) => r.type === "lene" && r.status === "pending");
  const dene = rows.filter((r) => r.type === "dene" && r.status === "pending");
  const settled = rows.filter((r) => r.status === "settled");
  const leneTotal = lene.reduce((s, r) => s + r.amount, 0);
  const deneTotal = dene.reduce((s, r) => s + r.amount, 0);

  const Card = ({ u }) => {
    const isLene = u.type === "lene";
    return (
      <div data-testid={`udhaar-card-${u.id}`}
        className="bg-white border border-[#E7E5DF] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-heading text-lg font-semibold text-[#1C1917]">{u.person_name}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={isLene
                ? "bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/30"
                : "bg-[#D96C52]/10 text-[#B15039] border border-[#D96C52]/30"}>
                {isLene ? "Lena hai" : "Dena hai"}
              </Badge>
              {u.due_date && (
                <span className="text-xs text-[#78716C]">Due: {u.due_date}</span>
              )}
              {u.phone && <span className="text-xs text-[#78716C] flex items-center gap-1"><Phone className="w-3 h-3"/>{u.phone}</span>}
            </div>
          </div>
          <div className={`font-heading text-xl font-bold ${isLene ? "text-[#3B6446]" : "text-[#B15039]"}`}>
            {formatMoney(u.amount, cur)}
          </div>
        </div>
        {u.note && <div className="text-sm text-[#57534E]">{u.note}</div>}
        {u.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => remind(u)}
              data-testid={`udhaar-remind-${u.id}`}
              className="border-[#E7E5DF] rounded-full">
              <Bell className="w-3.5 h-3.5 mr-1" /> Remind
            </Button>
            <Button size="sm" onClick={() => settle(u)}
              data-testid={`udhaar-settle-${u.id}`}
              className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Settle
            </Button>
            <button onClick={() => del(u.id)}
              data-testid={`udhaar-delete-${u.id}`}
              className="ml-auto p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Udhaar Tracker</h1>
          <p className="text-sm text-[#57534E] mt-1">Kisse lena hai, kisko dena hai — sab yaad.</p>
        </div>
        <Button onClick={() => setOpen(true)}
          data-testid="udhaar-add-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Add Udhaar
        </Button>
      </div>

      {(lene.length + dene.length) > 0 && (
        <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold text-[#1C1917]">Overdue reminders</div>
            <div className="text-xs text-[#57534E]">
              {[...lene, ...dene].filter((u) => u.phone).length} logon ke paas phone number hai —
              ek click mein sabko WhatsApp par yaad dilaao.
            </div>
          </div>
          <Button
            onClick={remindAll}
            data-testid="udhaar-remind-all-btn"
            className="bg-[#25D366] hover:bg-[#1DA851] text-white rounded-full"
          >
            <Bell className="w-4 h-4 mr-1" /> Remind All on WhatsApp
          </Button>
          <Button
            onClick={async () => {
              try {
                const { data } = await http.post("/billing/overdue-digest/send");
                toast.success(`Digest emailed to ${data.recipient} (${data.count} invoices)`);
              } catch (e) {
                toast.error(e?.response?.data?.detail || "Digest send failed");
              }
            }}
            data-testid="udhaar-email-digest-btn"
            variant="outline"
            className="border-[#2A4F4F] text-[#2A4F4F] hover:bg-[#2A4F4F]/5 rounded-full"
          >
            <Bell className="w-4 h-4 mr-1" /> Email Digest
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#3B6446]">Total Lena Hai</div>
          <div className="font-heading text-3xl font-bold text-[#3B6446] mt-1">{formatMoney(leneTotal, cur)}</div>
          <div className="text-sm text-[#3B6446]/80 mt-1">{lene.length} logon se</div>
        </div>
        <div className="bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-xl p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#B15039]">Total Dena Hai</div>
          <div className="font-heading text-3xl font-bold text-[#B15039] mt-1">{formatMoney(deneTotal, cur)}</div>
          <div className="text-sm text-[#B15039]/80 mt-1">{dene.length} logon ko</div>
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-3">Paise Lene Hain</h2>
        {lene.length === 0
          ? <div className="text-sm text-[#78716C] bg-white border border-[#E7E5DF] rounded-xl p-8 text-center">
              Kisise lena baaki nahi hai 🎉
            </div>
          : <div className="grid md:grid-cols-2 gap-3">{lene.map((u) => <Card key={u.id} u={u} />)}</div>}
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-3">Paise Dene Hain</h2>
        {dene.length === 0
          ? <div className="text-sm text-[#78716C] bg-white border border-[#E7E5DF] rounded-xl p-8 text-center">
              Kisi ko dena baaki nahi hai 🎉
            </div>
          : <div className="grid md:grid-cols-2 gap-3">{dene.map((u) => <Card key={u.id} u={u} />)}</div>}
      </div>

      {settled.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-3">Settled</h2>
          <div className="bg-white border border-[#E7E5DF] rounded-xl divide-y divide-[#E7E5DF]">
            {settled.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium text-[#57534E]">{u.person_name}</span>
                  <span className="text-[#A8A29E] ml-2">
                    {u.type === "lene" ? "se lena tha" : "ko dena tha"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#78716C]">{formatMoney(u.amount, cur)}</span>
                  <button onClick={() => del(u.id)}
                    className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#B15039] hover:bg-[#D96C52]/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddUdhaarDialog open={open} onOpenChange={setOpen} onDone={load} />
    </div>
  );
}
