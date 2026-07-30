import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_TYPES, CURRENCIES, http } from "@/lib/api";
import { toast } from "sonner";

const COLORS = ["#2A4F4F", "#4A7C59", "#D96C52", "#E8B365", "#7A6C5D", "#3B6446", "#8B6220"];

export default function AddAccountDialog({ open, onOpenChange, onDone }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("savings");
  const [opening, setOpening] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [color, setColor] = useState("#2A4F4F");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setType("savings"); setOpening(""); setColor("#2A4F4F");
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Account ka naam daalo");
    setSaving(true);
    try {
      await http.post("/accounts", {
        name: name.trim(),
        type,
        opening_balance: Number(opening || 0),
        currency,
        color,
      });
      toast.success("Account ban gaya!");
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
          <DialogTitle className="font-heading">Naya Account</DialogTitle>
          <DialogDescription>Savings, Current, Emergency Fund, Investment — jo bhi ho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              data-testid="account-name-input"
              className="mt-1.5" placeholder="e.g. HDFC Savings" />
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5" data-testid="account-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Opening Balance</Label>
              <Input type="number" step="0.01" value={opening}
                onChange={(e) => setOpening(e.target.value)}
                data-testid="account-opening-input"
                className="mt-1.5" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5" data-testid="account-currency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Color</Label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  data-testid={`color-swatch-${c.replace("#", "")}`}
                  className={`w-8 h-8 rounded-md border-2 transition-transform ${
                    color === c ? "border-[#1C1917] scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <Button onClick={submit} disabled={saving}
            data-testid="account-submit-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
            {saving ? "Save ho raha…" : "Account banao"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
