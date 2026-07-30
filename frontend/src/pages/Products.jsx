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
import { toast } from "sonner";
import { Package, Plus, Search, Trash2, Edit3 } from "lucide-react";

const UNITS = ["PCS", "KG", "GM", "LTR", "ML", "MTR", "BOX", "DOZ", "PKT"];
const GST_RATES = [0, 5, 12, 18, 28];

const emptyForm = {
  name: "", sku: "", hsn: "", barcode: "", category: "General", brand: "",
  unit: "PCS", price: "", mrp: "", purchase_price: "", gst_rate: 18,
  stock: 0, low_stock_alert: 5,
};

export default function Products() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await http.get("/billing/products", { params: q ? { q } : {} });
    setItems(data || []);
  };

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ ...emptyForm, ...p });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) { toast.error("Product name zaroori hai"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        mrp: Number(form.mrp) || 0,
        purchase_price: Number(form.purchase_price) || 0,
        gst_rate: Number(form.gst_rate) || 0,
        stock: Number(form.stock) || 0,
        low_stock_alert: Number(form.low_stock_alert) || 0,
      };
      if (editing) {
        await http.patch(`/billing/products/${editing}`, payload);
        toast.success("Updated");
      } else {
        await http.post("/billing/products", payload);
        toast.success("Product added");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await http.delete(`/billing/products/${id}`);
    load();
  };

  return (
    <div className="space-y-4" data-testid="products-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Package className="w-7 h-7 text-[#2A4F4F]" /> Products
          </h1>
          <p className="text-[#78716C] mt-1">Inventory + pricing + GST management</p>
        </div>
        <Button onClick={openAdd} data-testid="add-product-btn" className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
          <Plus className="w-4 h-4 mr-1" /> Naya Product
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
        <Input placeholder="Name, SKU, barcode search..." value={q} onChange={(e) => setQ(e.target.value)}
          data-testid="product-search" className="pl-9 max-w-md" />
      </div>

      {items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#78716C]">Koi product nahi. "Naya Product" dabao.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5DF] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F8F6] text-[#78716C] text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3 hidden sm:table-cell">Category</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-right p-3 hidden md:table-cell">Stock</th>
                  <th className="text-right p-3 hidden md:table-cell">GST</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {items.map((p) => {
                  const low = Number(p.stock) <= Number(p.low_stock_alert || 0);
                  return (
                    <tr key={p.id} data-testid={`product-${p.id}`}>
                      <td className="p-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-[#78716C]">{p.sku || "-"} · HSN: {p.hsn || "-"}</div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F0EA]">{p.category}</span>
                      </td>
                      <td className="p-3 text-right font-semibold">{formatMoney(p.price, cur)}</td>
                      <td className={`p-3 text-right hidden md:table-cell ${low ? "text-[#B15039] font-semibold" : ""}`}>
                        {p.stock} {p.unit}
                        {low && <span className="ml-1 text-xs">⚠</span>}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell">{p.gst_rate}%</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(p)} data-testid={`edit-product-${p.id}`}
                          className="p-1.5 hover:bg-[#F2F0EA] rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(p.id)} data-testid={`delete-product-${p.id}`}
                          className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Naya Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Name *</Label>
                <Input data-testid="product-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div><Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div><Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div><Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div><Label>HSN Code</Label>
                <Input value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
              </div>
              <div><Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div><Label>Unit</Label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md text-sm bg-white">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><Label>GST Rate (%)</Label>
                <select value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: Number(e.target.value) })}
                  className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md text-sm bg-white">
                  {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div><Label>Selling Price</Label>
                <Input type="number" data-testid="product-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div><Label>MRP</Label>
                <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
              </div>
              <div><Label>Purchase Price</Label>
                <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              </div>
              <div><Label>Current Stock</Label>
                <Input type="number" data-testid="product-stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div><Label>Low Stock Alert</Label>
                <Input type="number" value={form.low_stock_alert} onChange={(e) => setForm({ ...form, low_stock_alert: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="product-save-btn"
              className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
