import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, http, ensureNotificationPermission, showBudgetNotification } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Sparkles, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE = "Rs.499.00 debited from HDFC Bank A/c XX1234 on 22-Feb-26 UPI/Zomato/Order#8823. Avl Bal Rs.32,450";

export default function SmsParseDialog({ open, onOpenChange, accounts, onDone }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  // editable copy
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setText(""); setParsed(null); setAmount(""); setNote("");
      setType("expense"); setCategory("Food");
      setAccountId(accounts?.[0]?.id || "");
    }
  }, [open, accounts]);

  const parse = async () => {
    if (!text.trim()) return toast.error("SMS paste karo pehle");
    setParsing(true);
    try {
      const { data } = await http.post("/sms/parse", { text });
      setParsed(data);
      setType(data.type || "expense");
      setAmount(String(data.amount || ""));
      setCategory(data.category || (data.type === "income" ? "Other Income" : "Other"));
      setAccountId(data.suggested_account_id || accounts?.[0]?.id || "");
      setNote(data.note || data.merchant || "");
      if (data.amount) {
        toast.success(`Parse ho gaya (${Math.round(data.confidence * 100)}% confident)`);
      } else {
        toast("Amount nahi mila — manually daalo", { duration: 4000 });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Parse nahi ho paya");
    } finally { setParsing(false); }
  };

  const save = async () => {
    if (!accountId) return toast.error("Account choose karo");
    if (!amount || Number(amount) <= 0) return toast.error("Sahi amount daalo");
    setSaving(true);
    try {
      const { data } = await http.post("/transactions", {
        account_id: accountId, type, amount: Number(amount), category, note,
      });
      toast.success("Transaction save ho gaya!");
      if (data?.budget_alerts?.length > 0) {
        await ensureNotificationPermission();
        data.budget_alerts.forEach((a) => {
          toast(
            a.level === "over"
              ? `Budget cross ho gaya: ${a.category} (${a.percent}%)`
              : `Budget alert: ${a.category} ${a.percent}% use ho gaya`,
            { duration: 6000 }
          );
          showBudgetNotification(a, user?.currency || "INR");
        });
      }
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save nahi ho paya");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2A4F4F]" /> SMS se Transaction
          </DialogTitle>
          <DialogDescription>Bank ya UPI ka SMS paste karo, Munim Ji khud sab nikaal denge.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">SMS Text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)}
              rows={4} placeholder={SAMPLE}
              data-testid="sms-text-input"
              className="mt-1.5 font-mono text-xs" />
            <button type="button" onClick={() => setText(SAMPLE)}
              data-testid="sms-sample-btn"
              className="text-xs text-[#2A4F4F] hover:underline mt-1">
              Sample daal do
            </button>
          </div>

          <Button onClick={parse} disabled={parsing || !text.trim()}
            data-testid="sms-parse-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-10">
            {parsing
              ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Parse ho raha…</>
              : <><Sparkles className="w-4 h-4 mr-1" /> Parse karo</>}
          </Button>

          {parsed && (
            <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#4A7C59]/10 text-[#3B6446] border border-[#4A7C59]/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Parsed
                </Badge>
                <Badge className="bg-[#E8B365]/15 text-[#8B6220] border border-[#E8B365]/30">
                  {Math.round(parsed.confidence * 100)}% confident
                </Badge>
                {parsed.llm_used && (
                  <Badge className="bg-[#2A4F4F]/10 text-[#2A4F4F] border border-[#2A4F4F]/20">
                    <Sparkles className="w-3 h-3 mr-1" /> AI assisted
                  </Badge>
                )}
                {parsed.account_last4 && (
                  <span className="text-xs text-[#78716C]">Card/Acc: ...{parsed.account_last4}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1" data-testid="sms-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Kharcha</SelectItem>
                      <SelectItem value="income">Aaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Amount</Label>
                  <Input type="number" step="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="sms-amount-input" className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="mt-1" data-testid="sms-account-select">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1" data-testid="sms-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES[type].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)}
                  data-testid="sms-note-input" className="mt-1" />
              </div>

              <Button onClick={save} disabled={saving}
                data-testid="sms-save-btn"
                className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-10">
                {saving ? "Save ho raha…" : "Save Transaction"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
