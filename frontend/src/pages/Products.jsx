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
import { Package, Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";

const EMPTY = {
  name: "", sku: "", category: "General",
  purchase_price: "", selling_price: "", gst_percent: "0", stock_qty: "0", low_stock_alert: "5",
};

export default function Products() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    const { data } = await http.get("/billing/products");
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku || "", category: p.category || "General",
      purchase_price: String(p.purchase_price), selling_price: String(p.selling_price),
      gst_percent: String(p.gst_percent), stock_qty: String(p.stock_qty),
      low_stock_alert: String(p.low_stock_alert),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Product name daalo"); return; }
    setSaving(true);
    try {
      if (editing) {
        await http.patch(`/billing/products/${editing.id}`, {
          name: form.name, sku: form.sku, category: form.category,
          purchase_price: parseFloat(form.purchase_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0,
          gst_percent: parseFloat(form.gst_percent) || 0,
          low_stock_alert: parseFloat(form.low_stock_alert) || 0,
        });
        toast.success("Product update ho gaya");
      } else {
        await http.post("/billing/products", {
          name: form.name, sku: form.sku, category: form.category,
          purchase_price: parseFloat(form.purchase_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0,
          gst_percent: parseFloat(form.gst_percent) || 0,
          stock_qty: parseFloat(form.stock_qty) || 0,
          low_stock_alert: parseFloat(form.low_stock_alert) || 5,
        });
        toast.success("Product add ho gaya");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ye product delete karna hai?")) return;
    await http.delete(`/billing/products/${id}`);
    toast.success("Product delete ho gaya");
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-[#2A4F4F]" />
          <h1 className="text-xl font-semibold text-[#1C1917]">Products</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#2A4F4F] hover:bg-[#1f3b3b]">
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "Naya Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Purchase Price</Label>
                  <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
                </div>
                <div>
                  <Label>Selling Price</Label>
                  <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GST %</Label>
                  <Input type="number" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} />
                </div>
                {!editing && (
                  <div>
                    <Label>Opening Stock Qty</Label>
                    <Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <Label>Low Stock Alert (qty)</Label>
                <Input type="number" value={form.low_stock_alert} onChange={(e) => setForm({ ...form, low_stock_alert: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={saving} onClick={save} className="bg-[#2A4F4F] hover:bg-[#1f3b3b]">
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-[#E7E4DD] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Purchase</TableHead>
              <TableHead>Selling</TableHead>
              <TableHead>GST</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>
                  <span className={p.stock_qty <= p.low_stock_alert ? "text-[#B15039] font-medium flex items-center gap-1" : ""}>
                    {p.stock_qty <= p.low_stock_alert && <AlertTriangle className="w-3.5 h-3.5" />}
                    {p.stock_qty}
                  </span>
                </TableCell>
                <TableCell>{formatMoney(p.purchase_price, cur)}</TableCell>
                <TableCell>{formatMoney(p.selling_price, cur)}</TableCell>
                <TableCell>{p.gst_percent}%</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4 text-[#B15039]" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[#78716C] py-8">
                  Koi product nahi hai. "Add Product" se shuru karo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
