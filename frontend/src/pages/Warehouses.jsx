import React, { useState, useEffect, useCallback } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Warehouse as WarehouseIcon, Layers3, Package, ArrowRightLeft,
  Plus, Trash2, Edit3, CheckCircle2, AlertTriangle,
} from "lucide-react";

/**
 * Warehouses Workspace — Phase 7 (Multi-warehouse inventory).
 * Tabs:
 *   - Warehouses  → master list
 *   - Stock       → current levels across warehouses, adjustment dialog
 *   - Batches     → batch/lot tracking with expiry
 *   - Serials     → serial-number tracking
 *   - Transfers   → stock transfers between warehouses (in-transit → received)
 */

export default function Warehouses() {
  const [tab, setTab] = useState("warehouses");

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#151312]" data-testid="warehouses-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
              <WarehouseIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C1917] font-heading">Warehouses &amp; Inventory</h1>
          </div>
          <p className="text-sm text-[#57534E]">Multi-warehouse stock, batches, serial numbers &amp; transfers</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-white dark:bg-[#1E1B1A] border border-[#E7E5DF] p-1 h-auto">
            <TabsTrigger value="warehouses" data-testid="tab-wh">Warehouses</TabsTrigger>
            <TabsTrigger value="stock" data-testid="tab-stock">Stock</TabsTrigger>
            <TabsTrigger value="batches" data-testid="tab-batches">Batches</TabsTrigger>
            <TabsTrigger value="serials" data-testid="tab-serials">Serials</TabsTrigger>
            <TabsTrigger value="transfers" data-testid="tab-transfers">Transfers</TabsTrigger>
          </TabsList>
          <TabsContent value="warehouses" className="mt-6"><WarehouseList /></TabsContent>
          <TabsContent value="stock" className="mt-6"><StockLevels /></TabsContent>
          <TabsContent value="batches" className="mt-6"><Batches /></TabsContent>
          <TabsContent value="serials" className="mt-6"><Serials /></TabsContent>
          <TabsContent value="transfers" className="mt-6"><Transfers /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- Warehouse Master ---------------- */

function WarehouseList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/warehouses");
      setRows(data.items || []);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const empty = { name: "", code: "", city: "", state: "", address: "", manager: "", phone: "", is_default: false };
  const save = async (payload) => {
    try {
      if (payload.id) await http.put(`/warehouses/${payload.id}`, payload);
      else await http.post("/warehouses", payload);
      toast.success("Warehouse saved");
      setEditing(null);
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this warehouse?")) return;
    try {
      await http.delete(`/warehouses/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="wh-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Warehouse
        </Button>
      </div>
      {loading ? <div className="text-sm text-[#78716C]">Loading…</div> : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
          <WarehouseIcon className="w-10 h-10 mx-auto text-[#78716C] mb-3" />
          <div className="font-semibold text-[#1C1917] mb-1">No warehouses yet</div>
          <div className="text-sm text-[#78716C] mb-4">Add your first warehouse to start tracking multi-location stock.</div>
          <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Warehouse
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((w) => (
            <Card key={w.id} className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid={`wh-card-${w.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1C1917]">{w.name}</span>
                    {w.is_default && <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs rounded font-semibold">DEFAULT</span>}
                  </div>
                  <div className="text-xs text-[#78716C] font-mono">{w.code || "—"}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(w)}><Edit3 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(w.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="mt-2 text-sm text-[#57534E] space-y-0.5">
                {w.address && <div>{w.address}</div>}
                {(w.city || w.state) && <div>{w.city}{w.city && w.state ? ", " : ""}{w.state}</div>}
                {w.manager && <div>Manager: {w.manager}</div>}
                {w.phone && <div>Ph: {w.phone}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <WhDialog value={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function WhDialog({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{value.id ? "Edit Warehouse" : "New Warehouse"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Name*"><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="wh-name" /></Fld>
          <Fld label="Code"><Input value={form.code || ""} onChange={(e) => set("code", e.target.value)} /></Fld>
          <Fld label="City"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Fld>
          <Fld label="State"><Input value={form.state || ""} onChange={(e) => set("state", e.target.value)} /></Fld>
          <Fld label="Address" full><Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} /></Fld>
          <Fld label="Manager"><Input value={form.manager || ""} onChange={(e) => set("manager", e.target.value)} /></Fld>
          <Fld label="Phone"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Fld>
          <div className="col-span-2 flex items-center gap-2 mt-1">
            <input type="checkbox" checked={!!form.is_default} onChange={(e) => set("is_default", e.target.checked)} id="def" />
            <label htmlFor="def" className="text-sm text-[#1C1917]">Set as default warehouse</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="wh-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children, full }) {
  return <div className={full ? "col-span-2" : ""}><Label className="text-xs text-[#57534E]">{label}</Label>{children}</div>;
}

/* ---------------- Stock Levels ---------------- */

function StockLevels() {
  const [levels, setLevels] = useState([]);
  const [summary, setSummary] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [adjust, setAdjust] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([
        http.get("/warehouses/stock"),
        http.get("/warehouses"),
      ]);
      setLevels(s.data.levels || []);
      setSummary(s.data.summary || []);
      setWarehouses(w.data.items || []);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doAdjust = async (payload) => {
    try {
      await http.post("/warehouses/stock/adjust", payload);
      toast.success("Stock adjusted");
      setAdjust(null);
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const whName = (id) => warehouses.find((w) => w.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdjust({ warehouse_id: warehouses[0]?.id || "", product_id: "", product_name: "", qty_delta: 0, reason: "" })} disabled={warehouses.length === 0} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="stock-adjust-btn">
          <Plus className="w-4 h-4 mr-1" /> Adjust Stock
        </Button>
      </div>
      {loading ? <div className="text-sm text-[#78716C]">Loading…</div> : levels.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
          <Layers3 className="w-10 h-10 mx-auto text-[#78716C] mb-3" />
          <div className="font-semibold text-[#1C1917] mb-1">No stock yet</div>
          <div className="text-sm text-[#78716C]">Adjust stock in a warehouse or create a batch with initial qty.</div>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Product</th>
                  <th className="text-left px-4 py-2 font-semibold">Warehouse</th>
                  <th className="text-left px-4 py-2 font-semibold">Batch</th>
                  <th className="text-right px-4 py-2 font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((l) => (
                  <tr key={l.id} className="border-t border-[#E7E5DF]">
                    <td className="px-4 py-2 font-mono text-xs text-[#1C1917]">{l.product_id}</td>
                    <td className="px-4 py-2 text-[#57534E]">{whName(l.warehouse_id)}</td>
                    <td className="px-4 py-2 text-[#57534E]">{l.batch_id || "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {adjust && <AdjustDialog value={adjust} warehouses={warehouses} onCancel={() => setAdjust(null)} onSave={doAdjust} />}
    </div>
  );
}

function AdjustDialog({ value, warehouses, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Warehouse" full>
            <select value={form.warehouse_id} onChange={(e) => set("warehouse_id", e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background">
              {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </Fld>
          <Fld label="Product ID*" full><Input value={form.product_id} onChange={(e) => set("product_id", e.target.value)} placeholder="product uuid" data-testid="adjust-product-id" /></Fld>
          <Fld label="Product Name" full><Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} /></Fld>
          <Fld label="Qty Delta*"><Input type="number" step="0.01" value={form.qty_delta} onChange={(e) => set("qty_delta", Number(e.target.value))} data-testid="adjust-qty" /></Fld>
          <Fld label="Reason*"><Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="e.g. Cycle count" data-testid="adjust-reason" /></Fld>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="adjust-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Batches ---------------- */

function Batches() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, w] = await Promise.all([http.get("/warehouses/batches"), http.get("/warehouses")]);
      setRows(b.data.items || []);
      setWarehouses(w.data.items || []);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const empty = { product_id: "", product_name: "", batch_no: "", mfg_date: "", expiry_date: "", warehouse_id: warehouses[0]?.id || "", initial_qty: 0, rate: 0 };

  const save = async (p) => {
    try { await http.post("/warehouses/batches", p); toast.success("Batch saved"); setEditing(null); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete batch?")) return;
    try { await http.delete(`/warehouses/batches/${id}`); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="batch-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Batch
        </Button>
      </div>
      {loading ? <div className="text-sm text-[#78716C]">Loading…</div> : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]"><Package className="w-10 h-10 mx-auto text-[#78716C] mb-3" /><div className="text-sm text-[#78716C]">No batches yet.</div></Card>
      ) : (
        <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
                <tr>
                  <th className="text-left px-4 py-2">Batch No</th>
                  <th className="text-left px-4 py-2">Product</th>
                  <th className="text-left px-4 py-2">Mfg Date</th>
                  <th className="text-left px-4 py-2">Expiry</th>
                  <th className="text-right px-4 py-2">Initial Qty</th>
                  <th className="text-right px-4 py-2">Rate</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const near = b.expiry_date && b.expiry_date <= today;
                  return (
                    <tr key={b.id} className="border-t border-[#E7E5DF]">
                      <td className="px-4 py-2 font-mono">{b.batch_no}</td>
                      <td className="px-4 py-2">{b.product_name || b.product_id}</td>
                      <td className="px-4 py-2 text-[#57534E]">{b.mfg_date || "-"}</td>
                      <td className={`px-4 py-2 ${near ? "text-rose-600 font-semibold" : "text-[#57534E]"}`}>
                        {near && <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />}
                        {b.expiry_date || "-"}
                      </td>
                      <td className="px-4 py-2 text-right">{b.initial_qty}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(b.rate)}</td>
                      <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && <BatchDialog value={editing} warehouses={warehouses} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function BatchDialog({ value, warehouses, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Batch</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Product ID*"><Input value={form.product_id} onChange={(e) => set("product_id", e.target.value)} data-testid="batch-product-id" /></Fld>
          <Fld label="Product Name"><Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} /></Fld>
          <Fld label="Batch No*"><Input value={form.batch_no} onChange={(e) => set("batch_no", e.target.value)} data-testid="batch-no" /></Fld>
          <Fld label="Warehouse">
            <select value={form.warehouse_id || ""} onChange={(e) => set("warehouse_id", e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background">
              {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </Fld>
          <Fld label="Mfg Date"><Input type="date" value={form.mfg_date || ""} onChange={(e) => set("mfg_date", e.target.value)} /></Fld>
          <Fld label="Expiry Date"><Input type="date" value={form.expiry_date || ""} onChange={(e) => set("expiry_date", e.target.value)} /></Fld>
          <Fld label="Initial Qty"><Input type="number" step="0.01" value={form.initial_qty} onChange={(e) => set("initial_qty", Number(e.target.value))} /></Fld>
          <Fld label="Rate (₹)"><Input type="number" step="0.01" value={form.rate} onChange={(e) => set("rate", Number(e.target.value))} /></Fld>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="batch-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Serials ---------------- */

function Serials() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/warehouses/serials", { params: { search, limit: 200 } });
      setRows(data.items || []);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const empty = { product_id: "", product_name: "", serial_no: "", status: "in_stock" };
  const save = async (p) => {
    try {
      if (p.id) await http.put(`/warehouses/serials/${p.id}`, p);
      else await http.post("/warehouses/serials", p);
      toast.success("Serial saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete serial?")) return;
    try { await http.delete(`/warehouses/serials/${id}`); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search serial…" className="max-w-xs" data-testid="serial-search" />
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white ml-auto" data-testid="serial-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Serial
        </Button>
      </div>
      {loading ? <div className="text-sm text-[#78716C]">Loading…</div> : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]"><div className="text-sm text-[#78716C]">No serials yet.</div></Card>
      ) : (
        <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
              <tr>
                <th className="text-left px-4 py-2">Serial No</th>
                <th className="text-left px-4 py-2">Product</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-[#E7E5DF]">
                  <td className="px-4 py-2 font-mono">{s.serial_no}</td>
                  <td className="px-4 py-2">{s.product_name || s.product_id}</td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{s.status}</span></td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Edit3 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing.id ? "Edit Serial" : "New Serial"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Product ID*"><Input value={editing.product_id} onChange={(e) => setEditing({ ...editing, product_id: e.target.value })} data-testid="serial-product-id" /></Fld>
              <Fld label="Product Name"><Input value={editing.product_name || ""} onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} /></Fld>
              <Fld label="Serial No*"><Input value={editing.serial_no} onChange={(e) => setEditing({ ...editing, serial_no: e.target.value })} data-testid="serial-no" /></Fld>
              <Fld label="Status">
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background">
                  <option value="in_stock">In Stock</option>
                  <option value="sold">Sold</option>
                  <option value="returned">Returned</option>
                  <option value="damaged">Damaged</option>
                </select>
              </Fld>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save(editing)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="serial-save">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ---------------- Transfers ---------------- */

function Transfers() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([http.get("/warehouses/transfers"), http.get("/warehouses")]);
      setRows(t.data.items || []);
      setWarehouses(w.data.items || []);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const empty = () => ({
    from_warehouse_id: warehouses[0]?.id || "",
    to_warehouse_id: warehouses[1]?.id || warehouses[0]?.id || "",
    transfer_date: new Date().toISOString().slice(0, 10),
    lines: [{ product_id: "", product_name: "", qty: 1, rate: 0 }],
    notes: "",
  });

  const save = async (p) => {
    try { await http.post("/warehouses/transfers", p); toast.success("Transfer created"); setEditing(null); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  const receive = async (id) => {
    try { await http.post(`/warehouses/transfers/${id}/receive`); toast.success("Marked received"); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete transfer?")) return;
    try { await http.delete(`/warehouses/transfers/${id}`); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const whName = (id) => warehouses.find((w) => w.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(empty())} disabled={warehouses.length < 2} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="xfer-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Transfer
        </Button>
      </div>
      {warehouses.length < 2 && <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded p-2">Add at least 2 warehouses to create transfers.</div>}
      {loading ? <div className="text-sm text-[#78716C]">Loading…</div> : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]"><ArrowRightLeft className="w-10 h-10 mx-auto text-[#78716C] mb-3" /><div className="text-sm text-[#78716C]">No transfers yet.</div></Card>
      ) : (
        <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
              <tr>
                <th className="text-left px-4 py-2">Transfer No</th>
                <th className="text-left px-4 py-2">From → To</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-right px-4 py-2">Value</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-[#E7E5DF]">
                  <td className="px-4 py-2 font-mono text-xs">{t.transfer_no}</td>
                  <td className="px-4 py-2 text-[#57534E]">{whName(t.from_warehouse_id)} <ArrowRightLeft className="inline w-3 h-3 mx-1" /> {whName(t.to_warehouse_id)}</td>
                  <td className="px-4 py-2">{t.transfer_date}</td>
                  <td className="px-4 py-2 text-right">{t.total_qty}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(t.total_value)}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.status === "received" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{t.status}</span></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {t.status !== "received" && <Button size="sm" variant="ghost" onClick={() => receive(t.id)} className="text-emerald-600" data-testid={`xfer-receive-${t.id}`}><CheckCircle2 className="w-3.5 h-3.5" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {editing && <XferDialog value={editing} warehouses={warehouses} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function XferDialog({ value, warehouses, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setForm((f) => {
    const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v };
    return { ...f, lines };
  });
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { product_id: "", product_name: "", qty: 1, rate: 0 }] }));
  const rmLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="From*">
            <select value={form.from_warehouse_id} onChange={(e) => set("from_warehouse_id", e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background" data-testid="xfer-from">
              {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </Fld>
          <Fld label="To*">
            <select value={form.to_warehouse_id} onChange={(e) => set("to_warehouse_id", e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background" data-testid="xfer-to">
              {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </Fld>
          <Fld label="Transfer Date"><Input type="date" value={form.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} /></Fld>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Lines</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          </div>
          <table className="w-full text-xs border border-[#E7E5DF] rounded">
            <thead className="bg-[#F2F0EA]"><tr>
              <th className="px-2 py-1 text-left">Product ID</th>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-right">Qty</th>
              <th className="px-2 py-1 text-right">Rate</th>
              <th className="px-2 py-1"></th>
            </tr></thead>
            <tbody>
              {form.lines.map((l, i) => (
                <tr key={i} className="border-t border-[#E7E5DF]">
                  <td className="px-2 py-1"><Input value={l.product_id} onChange={(e) => setLine(i, "product_id", e.target.value)} className="h-8" /></td>
                  <td className="px-2 py-1"><Input value={l.product_name} onChange={(e) => setLine(i, "product_name", e.target.value)} className="h-8" /></td>
                  <td className="px-2 py-1"><Input type="number" step="0.01" value={l.qty} onChange={(e) => setLine(i, "qty", Number(e.target.value))} className="h-8 text-right" /></td>
                  <td className="px-2 py-1"><Input type="number" step="0.01" value={l.rate} onChange={(e) => setLine(i, "rate", Number(e.target.value))} className="h-8 text-right" /></td>
                  <td className="px-2 py-1 text-right"><Button size="sm" variant="ghost" onClick={() => rmLine(i)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="xfer-save">Create Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
