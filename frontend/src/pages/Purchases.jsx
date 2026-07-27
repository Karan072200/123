import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, Plus, Trash2 } from "lucide-react";

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "upi", label: "UPI" },
  { value: "credit", label: "Credit (Udhaar)" },
];

export default function Purchases() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: "1", purchase_price: "", gst_percent: "0" }]);

  const load = async () => {
    const [p, prod, acc] = await Promise.all([
      http.get("/billing/purchases"),
      http.get("/billing/products"),
      http.get("/accounts"),
    ]);
    setPurchases(p.data || []);
    setProducts(prod.data || []);
    setAccounts(acc.data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setSupplierName(""); setSupplierPhone(""); setPaymentMode("cash");
    setAccountId(""); setDueDate(""); setNote("");
    setItems([{ product_id: "", quantity: "1", purchase_price: "", gst_percent: "0" }]);
  };

  const addRow = () => setItems([...items, { product_id: "", quantity: "1", purchase_price: "", gst_percent: "0" }]);
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateRow = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    // auto-fill purchase price from product when selected
    if (patch.product_id) {
      const prod = products.find((p) => p.id === patch.product_id);
      if (prod) {
        next[i].purchase_price = String(prod.purchase_price);
        next[i].gst_percent = String(prod.gst_percent);
      }
    }
    setItems(next);
  };

  const total = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.purchase_price) || 0;
    const gst = parseFloat(it.gst_percent) || 0;
    return sum + qty * price * (1 + gst / 100);
  }, 0);

  const save = async () => {
    if (!supplierName.trim()) { toast.error("Supplier name daalo"); return; }
    if (items.some((it) => !it.product_id || !it.quantity || !it.purchase_price)) {
      toast.error("Sab items complete karo"); return;
    }
    if (paymentMode !== "credit" && !accountId) { toast.error("Account chuno"); return; }

    setSaving(true);
    try {
      await http.post("/billing/purchase", {
        supplier_name: supplierName,
        supplier_phone: supplierPhone,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: parseFloat(it.quantity),
          purchase_price: parseFloat(it.purchase_price),
          gst_percent: parseFloat(it.gst_percent) || 0,
        })),
        payment_mode: paymentMode,
        account_id: paymentMode === "credit" ? null : accountId,
        due_date: paymentMode === "credit" ? dueDate : null,
        note,
      });
      toast.success("Purchase saved — inventory aur money dono update ho gaye");
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#2A4F4F]" />
          <h1 className="text-xl font-semibold text-[#1C1917]">Purchases</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2A4F4F] hover:bg-[#1f3b3b]"><Plus className="w-4 h-4 mr-1" /> New Purchase</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Purchase Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Supplier Name</Label>
                  <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                </div>
                <div>
                  <Label>Supplier Phone</Label>
                  <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Items</Label>
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <Select value={it.product_id} onValueChange={(v) => updateRow(i, { product_id: v })}>
                      <SelectTrigger className="w-[40%]"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" value={it.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })} className="w-[15%]" />
                    <Input type="number" placeholder="Price" value={it.purchase_price}
                      onChange={(e) => updateRow(i, { purchase_price: e.target.value })} className="w-[20%]" />
                    <Input type="number" placeholder="GST%" value={it.gst_percent}
                      onChange={(e) => updateRow(i, { gst_percent: e.target.value })} className="w-[15%]" />
                    <Button variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4 text-[#B15039]" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRow}>+ Item add karo</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {paymentMode !== "credit" ? (
                  <div>
                    <Label>Account</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger><SelectValue placeholder="Account chuno" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="text-right font-semibold text-[#1C1917]">
                Total: {formatMoney(total, cur)}
              </div>
            </div>
            <DialogFooter>
              <Button disabled={saving} onClick={save} className="bg-[#2A4F4F] hover:bg-[#1f3b3b]">
                {saving ? "Saving..." : "Save Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-[#E7E4DD] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.supplier_name}</TableCell>
                <TableCell>{p.items.length} items</TableCell>
                <TableCell className="capitalize">{p.payment_mode}</TableCell>
                <TableCell>{formatMoney(p.total, cur)}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString("en-IN")}</TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-[#78716C] py-8">
                Koi purchase entry nahi hai abhi.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
