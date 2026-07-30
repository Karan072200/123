import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2, Camera, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const CATEGORIES = ["Electronics", "Appliances", "Furniture", "Vehicle", "Jewelry", "Others"];

const statusBadge = (status) => {
  if (status === "active") return { icon: CheckCircle2, className: "bg-[#4A7C59]/10 text-[#3B6446]", label: "Active" };
  if (status === "expiring") return { icon: Clock, className: "bg-[#E8B365]/15 text-[#8B6220]", label: "Expiring Soon" };
  if (status === "expired") return { icon: AlertTriangle, className: "bg-[#D96C52]/10 text-[#B15039]", label: "Expired" };
  return { icon: Clock, className: "bg-[#F2F0EA] text-[#78716C]", label: "-" };
};

export default function Warranties() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_name: "",
    category: "Electronics",
    purchase_date: new Date().toISOString().slice(0, 10),
    warranty_months: 12,
    amount: "",
    store: "",
    note: "",
    receipt_image: "",
  });

  const load = async () => {
    const { data } = await http.get("/warranties");
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      toast.error("Photo 2MB se kam honi chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, receipt_image: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.item_name || !form.purchase_date) {
      toast.error("Item name aur purchase date zaroori hai");
      return;
    }
    setSaving(true);
    try {
      await http.post("/warranties", {
        ...form,
        amount: Number(form.amount) || 0,
        warranty_months: Number(form.warranty_months) || 12,
      });
      toast.success("Warranty saved!");
      setOpen(false);
      setForm({
        item_name: "",
        category: "Electronics",
        purchase_date: new Date().toISOString().slice(0, 10),
        warranty_months: 12,
        amount: "",
        store: "",
        note: "",
        receipt_image: "",
      });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this warranty?")) return;
    await http.delete(`/warranties/${id}`);
    load();
  };

  const expiringSoon = items.filter((w) => w.status === "expiring").length;
  const totalValue = items.reduce((s, w) => s + Number(w.amount || 0), 0);

  return (
    <div className="space-y-6" data-testid="warranties-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#2A4F4F]" />
            Warranty & Bill Vault
          </h1>
          <p className="text-[#78716C] mt-1">Sab receipts + warranty ek jagah, expiry reminders bhi</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-warranty-btn" className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              <Plus className="w-4 h-4 mr-1" /> Naya Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Naya Warranty Add Karo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Item Name *</Label>
                <Input data-testid="warranty-name" value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  placeholder="e.g. Samsung TV 55 inch" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Purchase Date *</Label>
                  <Input type="date" data-testid="warranty-purchase-date" value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
                <div>
                  <Label>Warranty (months)</Label>
                  <Input type="number" data-testid="warranty-months" value={form.warranty_months}
                    onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Store / Shop</Label>
                <Input value={form.store}
                  onChange={(e) => setForm({ ...form, store: e.target.value })}
                  placeholder="e.g. Croma, Amazon" />
              </div>
              <div>
                <Label>Receipt Photo (optional)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F2F0EA] hover:bg-[#E7E5DF] cursor-pointer text-sm">
                    <Camera className="w-4 h-4" /> Upload
                    <input type="file" accept="image/*" hidden data-testid="warranty-receipt-file" onChange={onFile} />
                  </label>
                  {form.receipt_image && <span className="text-xs text-[#3B6446]">✓ Attached</span>}
                </div>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Serial number, model etc." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} data-testid="warranty-save-btn"
                className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Total Items</div>
          <div className="font-heading text-2xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Expiring Soon</div>
          <div className="font-heading text-2xl font-bold mt-1 text-[#8B6220]">{expiringSoon}</div>
        </div>
        <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Total Value</div>
          <div className="font-heading text-2xl font-bold mt-1">{formatMoney(totalValue, cur)}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#78716C]">Abhi tak koi warranty save nahi ki. "Naya Item" dabao</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((w) => {
            const badge = statusBadge(w.status);
            const Icon = badge.icon;
            return (
              <div key={w.id} data-testid={`warranty-item-${w.id}`}
                className="bg-white border border-[#E7E5DF] rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-lg font-semibold text-[#1C1917] truncate">
                      {w.item_name}
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5">
                      {w.category} {w.store && `• ${w.store}`}
                    </div>
                  </div>
                  <button onClick={() => remove(w.id)} data-testid={`warranty-delete-${w.id}`}
                    className="text-[#B15039] hover:bg-[#D96C52]/10 p-1.5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-[#78716C]">Purchase</div>
                    <div className="font-medium">{new Date(w.purchase_date).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#78716C]">Expiry</div>
                    <div className="font-medium">{w.expiry_date ? new Date(w.expiry_date).toLocaleDateString("en-IN") : "-"}</div>
                  </div>
                  {w.amount > 0 && (
                    <div>
                      <div className="text-xs text-[#78716C]">Amount</div>
                      <div className="font-medium">{formatMoney(w.amount, cur)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-[#78716C]">Days Left</div>
                    <div className="font-medium">{w.days_left !== null ? `${w.days_left} din` : "-"}</div>
                  </div>
                </div>

                <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                  <Icon className="w-3 h-3" />
                  {badge.label}
                </div>

                {w.receipt_image && (
                  <a href={w.receipt_image} target="_blank" rel="noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs text-[#2A4F4F] hover:underline">
                    <ExternalLink className="w-3 h-3" /> View Receipt
                  </a>
                )}
                {w.note && <div className="mt-2 text-xs text-[#78716C] italic">"{w.note}"</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
