import React, { useEffect, useState } from "react";
import { http, formatMoney, formatApiError, API } from "@/lib/api";
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
import { FileText, Plus, Trash2, Download } from "lucide-react";

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "upi", label: "UPI" },
  { value: "credit", label: "Credit (Udhaar)" },
];

const INVOICE_TYPES = [
  { value: "gst_invoice", label: "GST Invoice" },
  { value: "tax_invoice", label: "Tax Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "delivery_challan", label: "Delivery Challan" },
];

export default function Invoices() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceType, setInvoiceType] = useState("tax_invoice");
  const [discount, setDiscount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: "1", unit_price: "", gst_percent: "" }]);

  const load = async () => {
    const [inv, prod, acc] = await Promise.all([
      http.get("/billing/invoices"),
      http.get("/billing/products"),
      http.get("/accounts"),
    ]);
    setInvoices(inv.data || []);
    setProducts(prod.data || []);
    setAccounts(acc.data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setInvoiceType("tax_invoice");
    setDiscount("0"); setPaymentMode("cash"); setAccountId(""); setDueDate(""); setNote("");
    setItems([{ product_id: "", quantity: "1", unit_price: "", gst_percent: "" }]);
  };

  const addRow = () => setItems([...items, { product_id: "", quantity: "1", unit_price: "", gst_percent: "" }]);
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateRow = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    if (patch.product_id) {
      const prod = products.find((p) => p.id === patch.product_id);
      if (prod) {
        next[i].unit_price = String(prod.selling_price);
        next[i].gst_percent = String(prod.gst_percent);
      }
    }
    setItems(next);
  };

  const subtotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    const gst = parseFloat(it.gst_percent) || 0;
    return sum + qty * price * (1 + gst / 100);
  }, 0);
  const grandTotal = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const save = async () => {
    if (!customerName.trim()) { toast.error("Customer name daalo"); return; }
    if (items.some((it) => !it.product_id || !it.quantity)) { toast.error("Sab items complete karo"); return; }
    if (paymentMode !== "credit" && !accountId) { toast.error("Account chuno"); return; }

    setSaving(true);
    try {
      await http.post("/billing/invoice", {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: parseFloat(it.quantity),
          unit_price: it.unit_price ? parseFloat(it.unit_price) : null,
          gst_percent: it.gst_percent ? parseFloat(it.gst_percent) : null,
        })),
        discount: parseFloat(discount) || 0,
        payment_mode: paymentMode,
        account_id: paymentMode === "credit" ? null : accountId,
        due_date: paymentMode === "credit" ? dueDate : null,
        invoice_type: invoiceType,
        note,
      });
      toast.success("Invoice saved — inventory aur money dono update ho gaye");
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = (id) => {
    window.open(`${API}/billing/invoices/${id}/pdf`, "_blank");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#2A4F4F]" />
          <h1 className="text-xl font-semibold text-[#1C1917]">Sales Invoices</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2A4F4F] hover:bg-[#1f3b3b]"><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Sales Invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Customer Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label>Customer Phone</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Invoice Type</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Items</Label>
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <Select value={it.product_id} onValueChange={(v) => updateRow(i, { product_id: v })}>
                      <SelectTrigger className="w-[40%]"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock_qty})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" value={it.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })} className="w-[15%]" />
                    <Input type="number" placeholder="Price" value={it.unit_price}
                      onChange={(e) => updateRow(i, { unit_price: e.target.value })} className="w-[20%]" />
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
                  <Label>Discount</Label>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="text-right font-semibold text-[#1C1917]">
                Grand Total: {formatMoney(grandTotal, cur)}
              </div>
            </div>
            <DialogFooter>
              <Button disabled={saving} onClick={save} className="bg-[#2A4F4F] hover:bg-[#1f3b3b]">
                {saving ? "Saving..." : "Save Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-[#E7E4DD] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                <TableCell>{inv.customer_name}</TableCell>
                <TableCell className="capitalize">{inv.invoice_type.replace("_", " ")}</TableCell>
                <TableCell className="capitalize">{inv.payment_mode}</TableCell>
                <TableCell>{formatMoney(inv.total, cur)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => downloadPdf(inv.id)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-[#78716C] py-8">
                Koi invoice nahi hai abhi.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
