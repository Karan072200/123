import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, http } from "@/lib/api";
import { toast } from "sonner";

export default function AddTransactionDialog({ open, onOpenChange, accounts, onDone, existing }) {
  const isEdit = Boolean(existing);
  const [type, setType] = useState("expense");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setType(existing.type);
        setAccountId(existing.account_id);
        setAmount(String(existing.amount));
        setCategory(existing.category);
        setNote(existing.note || "");
      } else {
        setType("expense");
        setAmount("");
        setNote("");
        setCategory("Food");
        setAccountId(accounts?.[0]?.id || "");
      }
    }
  }, [open, accounts, existing]);

  useEffect(() => {
    // only reset category to first when switching type in create mode
    if (!isEdit) setCategory(CATEGORIES[type][0]);
  }, [type, isEdit]);

  const submit = async () => {
    if (!accountId) return toast.error("Pehle ek account banao");
    if (!amount || Number(amount) <= 0) return toast.error("Sahi amount daalo");
    setSaving(true);
    try {
      const payload = { account_id: accountId, type, amount: Number(amount), category, note };
      if (isEdit) {
        await http.patch(`/transactions/${existing.id}`, payload);
        toast.success("Update ho gaya!");
      } else {
        await http.post("/transactions", payload);
        toast.success(type === "income" ? "Income add ho gayi!" : "Kharcha record ho gaya!");
      }
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nahi ho paya");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Edit Transaction" : "Naya Transaction"}</DialogTitle>
          <DialogDescription>{isEdit ? "Details update karo." : "Income ya kharcha add karo."}</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={setType} className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-[#F2F0EA]">
            <TabsTrigger value="expense" data-testid="txn-type-expense"
              className="data-[state=active]:bg-[#D96C52] data-[state=active]:text-white">Kharcha</TabsTrigger>
            <TabsTrigger value="income" data-testid="txn-type-income"
              className="data-[state=active]:bg-[#4A7C59] data-[state=active]:text-white">Aaya</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Amount</Label>
            <Input type="number" min="0" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="txn-amount-input"
              className="mt-1.5" placeholder="0.00" />
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1.5" data-testid="txn-account-select">
                <SelectValue placeholder="Account choose karo" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} data-testid={`txn-account-option-${a.id}`}>
                    {a.name} ({a.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5" data-testid="txn-category-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES[type].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              data-testid="txn-note-input"
              className="mt-1.5" rows={2} placeholder="Kya liya, kaha liya…" />
          </div>

          <Button onClick={submit} disabled={saving}
            data-testid="txn-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : isEdit ? "Update karo" : "Save karo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
