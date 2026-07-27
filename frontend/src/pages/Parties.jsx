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
import { Users, Plus, Trash2, Edit3, Phone, Mail } from "lucide-react";

const emptyForm = { name: "", phone: "", email: "", gstin: "", address: "", opening_balance: 0 };

export default function Parties({ kind = "customer" }) {
  const isCustomer = kind === "customer";
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const endpoint = isCustomer ? "/billing/customers" : "/billing/suppliers";

  const load = async () => { const { data } = await http.get(endpoint); setItems(data || []); };
  useEffect(() => { load(); }, [kind]);

  const save = async () => {
    if (!form.name) { toast.error("Name zaroori hai"); return; }
    setSaving(true);
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance) || 0 };
      if (editing) {
        await http.patch(`/billing/parties/${editing}`, payload);
        toast.success("Updated");
      } else {
        await http.post(endpoint, payload);
        toast.success(`${isCustomer ? "Customer" : "Supplier"} added`);
      }
      setOpen(false); setForm(emptyForm); setEditing(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete?")) return;
    await http.delete(`/billing/parties/${id}`);
    load();
  };

  const openEdit = (p) => { setEditing(p.id); setForm({ ...emptyForm, ...p }); setOpen(true); };
  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };

  const totalOutstanding = items.reduce((s, p) => s + Number(p.outstanding || 0), 0);

  return (
    <div className="space-y-4" data-testid={`${kind}s-page`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#2A4F4F]" />
            {isCustomer ? "Customers" : "Suppliers"}
          </h1>
          <p className="text-[#78716C] mt-1">
            {isCustomer ? "Customer ledger & outstanding" : "Supplier ledger & payables"}
          </p>
        </div>
        <Button onClick={openAdd} data-testid={`add-${kind}-btn`} className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
          <Plus className="w-4 h-4 mr-1" /> {isCustomer ? "Naya Customer" : "Naya Supplier"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
          <div className="text-xs uppercase text-[#78716C]">Total</div>
          <div className="font-heading text-2xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
          <div className="text-xs uppercase text-[#78716C]">{isCustomer ? "Receivable" : "Payable"}</div>
          <div className={`font-heading text-2xl font-bold mt-1 ${totalOutstanding > 0 ? "text-[#B15039]" : ""}`}>
            {formatMoney(totalOutstanding, cur)}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#E7E5DF] rounded-xl p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-[#A8A29E] mb-3" />
          <p className="text-[#78716C]">Koi entry nahi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((p) => (
            <div key={p.id} data-testid={`party-${p.id}`}
              className="bg-white border border-[#E7E5DF] rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-[#78716C] flex items-center gap-2 flex-wrap mt-0.5">
                    {p.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{p.phone}</span>}
                    {p.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{p.email}</span>}
                  </div>
                  {p.gstin && <div className="text-xs text-[#78716C] mt-0.5">GSTIN: {p.gstin}</div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-[#F2F0EA] rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-[#D96C52]/10 rounded text-[#B15039]"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#E7E5DF] pt-3">
                <span className="text-xs text-[#78716C] uppercase">Outstanding</span>
                <span className={`font-heading font-bold ${Number(p.outstanding) > 0 ? "text-[#B15039]" : "text-[#3B6446]"}`}>
                  {formatMoney(p.outstanding || 0, cur)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} {isCustomer ? "Customer" : "Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="party-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div><Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div><Label>GSTIN</Label>
              <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </div>
            <div><Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div><Label>Opening Balance ({isCustomer ? "they owe you" : "you owe"})</Label>
              <Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="party-save-btn"
              className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
