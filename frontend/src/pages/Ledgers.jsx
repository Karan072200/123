import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { http } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, LogIn, Copy, LogOut, CheckCircle2, Crown } from "lucide-react";
import { toast } from "sonner";

export default function Ledgers() {
  const { user, refresh, switchLedger } = useAuth();
  const [rows, setRows] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await http.get("/ledgers").then((r) => r.data);
    setRows(r);
  };
  useEffect(() => { load(); }, []);

  const createLedger = async () => {
    if (!name.trim()) return toast.error("Ledger ka naam do");
    setSaving(true);
    try {
      await http.post("/ledgers", { name: name.trim() });
      toast.success("Shared ledger ban gaya!");
      setCreateOpen(false); setName("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nahi ho paya");
    } finally { setSaving(false); }
  };

  const joinLedger = async () => {
    if (!code.trim()) return toast.error("Invite code do");
    setSaving(true);
    try {
      await http.post("/ledgers/join", { invite_code: code.trim().toUpperCase() });
      toast.success("Ledger join ho gaya!");
      setJoinOpen(false); setCode("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid invite code");
    } finally { setSaving(false); }
  };

  const doSwitch = async (id) => {
    await switchLedger(id);
    toast.success("Ledger switch ho gaya!");
    load();
  };

  const leave = async (id) => {
    if (!window.confirm("Ledger chhodna hai? Data personal mein wapas nahi aayega.")) return;
    try {
      await http.post(`/ledgers/${id}/leave`);
      toast.success("Ledger chhoda gaya");
      await refresh();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nahi ho paya");
    }
  };

  const copyCode = (c) => {
    navigator.clipboard?.writeText(c);
    toast.success(`Code copy ho gaya: ${c}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Family / Shared Ledgers</h1>
          <p className="text-sm text-[#57534E] mt-1">Ghar walon ke saath ek hi Apka Munim share karo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}
            data-testid="ledger-join-btn"
            className="border-[#E7E5DF] rounded-full">
            <LogIn className="w-4 h-4 mr-1" /> Join by Code
          </Button>
          <Button onClick={() => setCreateOpen(true)}
            data-testid="ledger-create-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Create Ledger
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((l) => {
          const isActive = l.id === user?.current_ledger_id;
          return (
            <div key={l.id} data-testid={`ledger-card-${l.id}`}
              className={`bg-white border rounded-xl p-5 ${
                isActive ? "border-[#2A4F4F] ring-2 ring-[#2A4F4F]/20" : "border-[#E7E5DF]"
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={l.type === "shared"
                      ? "bg-[#E8B365]/20 text-[#8B6220] border border-[#E8B365]/30"
                      : "bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/20"}>
                      {l.type === "shared" ? "Shared" : "Personal"}
                    </Badge>
                    {l.is_owner && l.type === "shared" && (
                      <Badge className="bg-[#2A4F4F]/10 text-[#2A4F4F] border border-[#2A4F4F]/20">
                        <Crown className="w-3 h-3 mr-1" /> Owner
                      </Badge>
                    )}
                    {isActive && (
                      <Badge className="bg-[#4A7C59] text-white border border-[#4A7C59]">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#1C1917] mt-2">{l.name}</h3>
                  <div className="text-xs text-[#78716C] mt-0.5">
                    <Users className="w-3 h-3 inline mr-1" />
                    {l.members_detail?.length || 1} member{(l.members_detail?.length || 1) === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              {l.type === "shared" && l.invite_code && (
                <div className="mt-3 flex items-center justify-between bg-[#F2F0EA] rounded-lg p-3">
                  <div>
                    <div className="text-xs text-[#78716C] uppercase tracking-widest font-semibold">Invite Code</div>
                    <div className="font-mono font-bold text-lg text-[#1C1917] tracking-widest">{l.invite_code}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyCode(l.invite_code)}
                    data-testid={`ledger-copy-code-${l.id}`}
                    className="border-[#E7E5DF] rounded-full">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              <div className="mt-3">
                <div className="text-xs uppercase tracking-widest text-[#A8A29E] font-semibold mb-1">Members</div>
                <div className="flex flex-wrap gap-1">
                  {(l.members_detail || []).map((m) => (
                    <div key={m.id} className="text-xs bg-[#F9F8F6] border border-[#E7E5DF] rounded-full px-2.5 py-1">
                      {m.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E7E5DF] flex gap-2">
                {!isActive && (
                  <Button size="sm" onClick={() => doSwitch(l.id)}
                    data-testid={`ledger-switch-${l.id}`}
                    className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full flex-1">
                    Switch to this
                  </Button>
                )}
                {l.type === "shared" && (
                  <Button size="sm" variant="outline" onClick={() => leave(l.id)}
                    data-testid={`ledger-leave-${l.id}`}
                    className="border-[#D96C52]/30 text-[#B15039] hover:bg-[#D96C52]/10 rounded-full">
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Leave
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#E8B365]/10 border border-[#E8B365]/30 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-[#8B6220]">Kaise kaam karta hai?</h3>
        <ol className="text-sm text-[#57534E] mt-2 space-y-1 list-decimal list-inside">
          <li>Ek shared ledger banao (e.g. "Family", "Roommates", "Business")</li>
          <li>Invite code apne family/dost ko bhejo</li>
          <li>Wo <b>Join by Code</b> click karke code daale — ho gaya</li>
          <li>"Switch to this" click karke uss ledger mein aa jao — sab members ka combined income/kharcha dikhega</li>
          <li>Wapas Personal mein switch karo apni private cheezein dekhne ke liye</li>
        </ol>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Naya Shared Ledger</DialogTitle>
            <DialogDescription>Ghar, roommates, business — jo bhi. Baad mein invite code se add karna.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family" data-testid="ledger-create-name-input"
              className="mt-1.5" />
          </div>
          <Button onClick={createLedger} disabled={saving}
            data-testid="ledger-create-submit"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Ban raha…" : "Create karo"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Ledger Join karo</DialogTitle>
            <DialogDescription>Owner se 6-character invite code lo.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Invite Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD" maxLength={6}
              data-testid="ledger-join-code-input"
              className="mt-1.5 font-mono uppercase tracking-widest text-lg" />
          </div>
          <Button onClick={joinLedger} disabled={saving}
            data-testid="ledger-join-submit"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Join ho raha…" : "Join karo"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
