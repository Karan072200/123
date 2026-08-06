import React, { useEffect, useMemo, useState, useCallback } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Factory, Layers, Scissors, ClipboardList, TrendingUp,
  Plus, Trash2, Edit3, ArrowRight, Package, Users,
} from "lucide-react";

/**
 * Manufacturing Workspace — Garment ERP Phase 8 (MVP)
 *
 * Single unified page with 5 tabs:
 *   - Dashboard   → KPIs + stage load
 *   - Fabrics     → raw-material master (fabric name, GSM, color, unit, stock, rate)
 *   - BOM         → Bill of Materials for each finished product
 *   - Orders      → Production Orders with multi-stage tracking (Cutting → Stitching → Embroidery → Printing → Washing → Packing → QC)
 *   - Job Work    → Outsourced work sent to vendors
 */

const STAGE_ICONS = {
  Cutting: Scissors,
  Stitching: Layers,
  Embroidery: Layers,
  Printing: ClipboardList,
  Washing: Layers,
  Packing: Package,
  QC: ClipboardList,
};

const STATUS_STYLES = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
};

export default function Manufacturing() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#151312]" data-testid="manufacturing-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917] font-heading">Manufacturing</h1>
            </div>
            <p className="text-sm text-[#57534E]">
              Garment ERP · BOM, production orders, job-work &amp; wastage tracking
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-white dark:bg-[#1E1B1A] border border-[#E7E5DF] p-1 h-auto">
            <TabsTrigger value="dashboard" data-testid="tab-mfg-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="fabrics" data-testid="tab-mfg-fabrics">Fabrics</TabsTrigger>
            <TabsTrigger value="boms" data-testid="tab-mfg-boms">BOM</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-mfg-orders">Orders</TabsTrigger>
            <TabsTrigger value="job-work" data-testid="tab-mfg-jobwork">Job Work</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6"><MfgDashboard /></TabsContent>
          <TabsContent value="fabrics" className="mt-6"><Fabrics /></TabsContent>
          <TabsContent value="boms" className="mt-6"><BOMs /></TabsContent>
          <TabsContent value="orders" className="mt-6"><Orders /></TabsContent>
          <TabsContent value="job-work" className="mt-6"><JobWork /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ================================ DASHBOARD ============================== */

function MfgDashboard() {
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await http.get("/manufacturing/dashboard");
        if (!cancel) setKpi(data);
      } catch (e) {
        if (!cancel) toast.error(formatApiError(e?.response?.data?.detail));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) return <div className="text-sm text-[#57534E]">Loading…</div>;
  if (!kpi) return <div className="text-sm text-rose-500">Failed to load dashboard.</div>;

  const cards = [
    { label: "Open Orders", value: kpi.open_orders, icon: ClipboardList, tone: "bg-blue-500/10 text-blue-600" },
    { label: "Completed", value: kpi.completed_orders, icon: Package, tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "Delayed", value: kpi.delayed_orders, icon: TrendingUp, tone: "bg-rose-500/10 text-rose-600" },
    { label: "BOMs", value: kpi.total_boms, icon: Layers, tone: "bg-amber-500/10 text-amber-600" },
    { label: "Fabrics", value: kpi.total_fabrics, icon: Scissors, tone: "bg-purple-500/10 text-purple-600" },
    { label: "Wastage Value", value: formatMoney(kpi.wastage_value), icon: TrendingUp, tone: "bg-orange-500/10 text-orange-600" },
  ];

  const stageLoad = kpi.stage_load || {};
  const stageEntries = Object.entries(stageLoad);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
            <div className={`w-9 h-9 rounded-lg ${tone} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#57534E] mb-0.5">{label}</div>
            <div className="text-lg font-bold text-[#1C1917]">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
        <h3 className="font-heading font-semibold text-[#1C1917] mb-4">Current Stage Load</h3>
        {stageEntries.length === 0 ? (
          <div className="text-sm text-[#78716C]">No orders are in progress right now.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {stageEntries.map(([name, count]) => {
              const Icon = STAGE_ICONS[name] || Layers;
              return (
                <div key={name} className="flex flex-col items-center bg-[#F2F0EA] dark:bg-[#262220] rounded-lg p-3">
                  <Icon className="w-5 h-5 text-[#2A4F4F] mb-1" />
                  <div className="text-xs text-[#57534E]">{name}</div>
                  <div className="font-bold text-[#1C1917]">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================================ FABRICS ================================ */

function useCrudList(endpoint) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get(endpoint, { params: { search, limit: 200 } });
      setRows(data.items || []);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [endpoint, search]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, search, setSearch, reload: load };
}

function Fabrics() {
  const { rows, loading, search, setSearch, reload } = useCrudList("/manufacturing/fabrics");
  const [editing, setEditing] = useState(null);

  const empty = { name: "", fabric_type: "cotton", gsm: 0, color: "", unit: "meter", rate: 0, stock_qty: 0, min_stock: 0, notes: "" };
  const openNew = () => setEditing(empty);

  const save = async (payload) => {
    try {
      if (payload.id) await http.put(`/manufacturing/fabrics/${payload.id}`, payload);
      else await http.post("/manufacturing/fabrics", payload);
      toast.success("Fabric saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this fabric?")) return;
    try {
      await http.delete(`/manufacturing/fabrics/${id}`);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fabrics…" className="max-w-xs" data-testid="fabric-search" />
        <Button onClick={openNew} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white ml-auto" data-testid="fabric-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Fabric
        </Button>
      </div>

      <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Type</th>
                <th className="text-left px-4 py-2 font-semibold">GSM</th>
                <th className="text-left px-4 py-2 font-semibold">Color</th>
                <th className="text-right px-4 py-2 font-semibold">Stock</th>
                <th className="text-right px-4 py-2 font-semibold">Rate</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-[#78716C]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#78716C]">No fabrics yet. Add your first one.</td></tr>
              ) : rows.map((f) => (
                <tr key={f.id} className="border-t border-[#E7E5DF] hover:bg-[#F9F8F6] dark:hover:bg-[#201D1B]" data-testid={`fabric-row-${f.id}`}>
                  <td className="px-4 py-2 font-medium text-[#1C1917]">{f.name}</td>
                  <td className="px-4 py-2 text-[#57534E]">{f.fabric_type || "-"}</td>
                  <td className="px-4 py-2 text-[#57534E]">{f.gsm || "-"}</td>
                  <td className="px-4 py-2 text-[#57534E]">{f.color || "-"}</td>
                  <td className="px-4 py-2 text-right text-[#1C1917]">{f.stock_qty} {f.unit}</td>
                  <td className="px-4 py-2 text-right text-[#1C1917]">{formatMoney(f.rate)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(f)}><Edit3 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(f.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && <FabricDialog value={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function FabricDialog({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{value.id ? "Edit Fabric" : "New Fabric"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name*"><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="fabric-name" /></Field>
          <Field label="Type"><Input value={form.fabric_type || ""} onChange={(e) => set("fabric_type", e.target.value)} placeholder="cotton / poly" /></Field>
          <Field label="GSM"><Input type="number" value={form.gsm || 0} onChange={(e) => set("gsm", Number(e.target.value))} /></Field>
          <Field label="Color"><Input value={form.color || ""} onChange={(e) => set("color", e.target.value)} /></Field>
          <Field label="Unit"><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="meter/kg/roll" /></Field>
          <Field label="Rate (₹)"><Input type="number" step="0.01" value={form.rate} onChange={(e) => set("rate", Number(e.target.value))} /></Field>
          <Field label="Stock Qty"><Input type="number" step="0.01" value={form.stock_qty} onChange={(e) => set("stock_qty", Number(e.target.value))} /></Field>
          <Field label="Min Stock"><Input type="number" step="0.01" value={form.min_stock} onChange={(e) => set("min_stock", Number(e.target.value))} /></Field>
          <Field label="Notes" full><Input value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="fabric-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs text-[#57534E]">{label}</Label>
      {children}
    </div>
  );
}

/* ================================ BOMs =================================== */

function BOMs() {
  const { rows, loading, search, setSearch, reload } = useCrudList("/manufacturing/boms");
  const [editing, setEditing] = useState(null);

  const empty = {
    code: "", product_name: "", size: "", color: "",
    lines: [{ material_name: "", material_id: "", material_type: "fabric", qty: 1, unit: "meter", wastage_pct: 5, rate: 0 }],
    labour_cost: 0, overhead_cost: 0, notes: "",
  };

  const save = async (payload) => {
    try {
      if (payload.id) await http.put(`/manufacturing/boms/${payload.id}`, payload);
      else await http.post("/manufacturing/boms", payload);
      toast.success("BOM saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this BOM?")) return;
    try {
      await http.delete(`/manufacturing/boms/${id}`);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search BOMs…" className="max-w-xs" data-testid="bom-search" />
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white ml-auto" data-testid="bom-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New BOM
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="text-sm text-[#78716C] col-span-2">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[#78716C] col-span-2">No BOMs yet.</div>
        ) : rows.map((b) => (
          <Card key={b.id} className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid={`bom-card-${b.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-[#1C1917]">{b.product_name}</div>
                <div className="text-xs text-[#78716C] font-mono">{b.code} · {b.size || "—"} · {b.color || "—"}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(b)}><Edit3 className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-[#57534E]">
              {(b.lines || []).map((l, i) => (
                <div key={i} className="flex justify-between">
                  <span>{l.material_name} × {l.qty} {l.unit}</span>
                  <span>{formatMoney((l.qty * (1 + (l.wastage_pct || 0) / 100)) * (l.rate || 0))}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#E7E5DF] flex justify-between text-sm">
              <span className="text-[#57534E]">Material</span>
              <span className="font-semibold">{formatMoney(b.material_cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#57534E]">Labour + Overhead</span>
              <span className="font-semibold">{formatMoney((b.labour_cost || 0) + (b.overhead_cost || 0))}</span>
            </div>
            <div className="flex justify-between text-base pt-1">
              <span className="font-semibold text-[#1C1917]">Total Cost</span>
              <span className="font-bold text-[#2A4F4F]">{formatMoney(b.total_cost)}</span>
            </div>
          </Card>
        ))}
      </div>

      {editing && <BOMDialog value={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function BOMDialog({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setForm((f) => {
    const lines = [...f.lines];
    lines[i] = { ...lines[i], [k]: v };
    return { ...f, lines };
  });
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { material_name: "", material_id: "", material_type: "fabric", qty: 1, unit: "meter", wastage_pct: 0, rate: 0 }] }));
  const removeLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const preview = useMemo(() => {
    const material = (form.lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (1 + (Number(l.wastage_pct) || 0) / 100) * (Number(l.rate) || 0), 0);
    return { material, total: material + Number(form.labour_cost || 0) + Number(form.overhead_cost || 0) };
  }, [form]);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{value.id ? "Edit BOM" : "New BOM"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Code*"><Input value={form.code} onChange={(e) => set("code", e.target.value)} data-testid="bom-code" /></Field>
          <Field label="Product Name*"><Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} data-testid="bom-product-name" /></Field>
          <Field label="Size"><Input value={form.size || ""} onChange={(e) => set("size", e.target.value)} placeholder="S/M/L/XL" /></Field>
          <Field label="Color"><Input value={form.color || ""} onChange={(e) => set("color", e.target.value)} /></Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Material Lines</Label>
            <Button size="sm" onClick={addLine} variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          </div>
          <div className="border border-[#E7E5DF] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#F2F0EA] text-[#57534E]">
                <tr>
                  <th className="px-2 py-2 text-left">Material</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Unit</th>
                  <th className="px-2 py-2 text-right">Wastage %</th>
                  <th className="px-2 py-2 text-right">Rate ₹</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((l, i) => (
                  <tr key={i} className="border-t border-[#E7E5DF]">
                    <td className="px-2 py-1"><Input value={l.material_name} onChange={(e) => setLine(i, "material_name", e.target.value)} className="h-8" /></td>
                    <td className="px-2 py-1"><Input type="number" step="0.01" value={l.qty} onChange={(e) => setLine(i, "qty", Number(e.target.value))} className="h-8 text-right" /></td>
                    <td className="px-2 py-1"><Input value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} className="h-8" /></td>
                    <td className="px-2 py-1"><Input type="number" step="0.1" value={l.wastage_pct} onChange={(e) => setLine(i, "wastage_pct", Number(e.target.value))} className="h-8 text-right" /></td>
                    <td className="px-2 py-1"><Input type="number" step="0.01" value={l.rate} onChange={(e) => setLine(i, "rate", Number(e.target.value))} className="h-8 text-right" /></td>
                    <td className="px-2 py-1 text-right"><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Labour Cost (₹)"><Input type="number" step="0.01" value={form.labour_cost || 0} onChange={(e) => set("labour_cost", Number(e.target.value))} /></Field>
          <Field label="Overhead Cost (₹)"><Input type="number" step="0.01" value={form.overhead_cost || 0} onChange={(e) => set("overhead_cost", Number(e.target.value))} /></Field>
        </div>

        <div className="mt-4 flex justify-end gap-6 text-sm">
          <div><span className="text-[#57534E]">Material: </span><span className="font-semibold">{formatMoney(preview.material)}</span></div>
          <div><span className="text-[#57534E]">Total: </span><span className="font-bold text-[#2A4F4F]">{formatMoney(preview.total)}</span></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="bom-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================ ORDERS ================================= */

function Orders() {
  const { rows, loading, search, setSearch, reload } = useCrudList("/manufacturing/orders");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const empty = {
    product_name: "", party_name: "", color: "", size_matrix: [{ size: "M", qty: 10 }],
    total_qty: 10, target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    stages: ["Cutting", "Stitching", "Embroidery", "Printing", "Washing", "Packing", "QC"],
    notes: "",
  };

  const save = async (payload) => {
    try {
      if (payload.id) await http.put(`/manufacturing/orders/${payload.id}`, payload);
      else await http.post("/manufacturing/orders", payload);
      toast.success("Production order saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this production order?")) return;
    try {
      await http.delete(`/manufacturing/orders/${id}`);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const advance = async (id) => {
    try {
      const { data } = await http.post(`/manufacturing/orders/${id}/advance`);
      toast.success(`Moved to ${data.status === "completed" ? "COMPLETED" : `stage ${data.current_stage_no}`}`);
      reload();
      if (detail?.id === id) setDetail(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders…" className="max-w-xs" data-testid="order-search" />
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white ml-auto" data-testid="order-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Order
        </Button>
      </div>

      <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Order No</th>
                <th className="text-left px-4 py-2 font-semibold">Product</th>
                <th className="text-left px-4 py-2 font-semibold">Buyer</th>
                <th className="text-right px-4 py-2 font-semibold">Qty</th>
                <th className="text-left px-4 py-2 font-semibold">Target Date</th>
                <th className="text-left px-4 py-2 font-semibold">Current Stage</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-6 text-[#78716C]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-[#78716C]">No production orders yet.</td></tr>
              ) : rows.map((o) => {
                const curStage = (o.stages_detail || []).find((s) => s.stage_no === o.current_stage_no);
                return (
                  <tr key={o.id} className="border-t border-[#E7E5DF] hover:bg-[#F9F8F6] dark:hover:bg-[#201D1B]" data-testid={`order-row-${o.id}`}>
                    <td className="px-4 py-2 font-mono text-xs text-[#1C1917]">{o.order_no}</td>
                    <td className="px-4 py-2 font-medium text-[#1C1917]">{o.product_name}</td>
                    <td className="px-4 py-2 text-[#57534E]">{o.party_name || "-"}</td>
                    <td className="px-4 py-2 text-right">{o.total_qty}</td>
                    <td className="px-4 py-2 text-[#57534E]">{o.target_date || "-"}</td>
                    <td className="px-4 py-2 text-[#1C1917]">{curStage?.name || "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[o.status] || ""}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(o)} data-testid={`order-view-${o.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                      {o.status !== "completed" && (
                        <Button size="sm" variant="ghost" onClick={() => advance(o.id)} className="text-emerald-600" data-testid={`order-advance-${o.id}`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(o.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && <OrderDialog value={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {detail && <OrderDetailDialog order={detail} onClose={() => { setDetail(null); reload(); }} />}
    </div>
  );
}

function OrderDialog({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSize = (i, k, v) => setForm((f) => {
    const size_matrix = [...f.size_matrix];
    size_matrix[i] = { ...size_matrix[i], [k]: v };
    const total_qty = size_matrix.reduce((s, x) => s + Number(x.qty || 0), 0);
    return { ...f, size_matrix, total_qty };
  });
  const addSize = () => setForm((f) => ({ ...f, size_matrix: [...f.size_matrix, { size: "", qty: 0 }] }));

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{value.id ? "Edit Production Order" : "New Production Order"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product Name*"><Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} data-testid="order-product-name" /></Field>
          <Field label="Buyer / Party"><Input value={form.party_name || ""} onChange={(e) => set("party_name", e.target.value)} /></Field>
          <Field label="Color"><Input value={form.color || ""} onChange={(e) => set("color", e.target.value)} /></Field>
          <Field label="Target Date"><Input type="date" value={form.target_date || ""} onChange={(e) => set("target_date", e.target.value)} /></Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Size Matrix (total: {form.total_qty})</Label>
            <Button size="sm" onClick={addSize} variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Add Size</Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {form.size_matrix.map((s, i) => (
              <div key={i} className="flex gap-1">
                <Input placeholder="Size" value={s.size} onChange={(e) => setSize(i, "size", e.target.value)} className="w-16 h-9 text-center" />
                <Input type="number" value={s.qty} onChange={(e) => setSize(i, "qty", Number(e.target.value))} className="h-9" />
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes"><Input value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="order-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDialog({ order, onClose }) {
  const [stages, setStages] = useState(order.stages_detail || []);

  const updateStage = async (stage_no, patch) => {
    try {
      const { data } = await http.post(`/manufacturing/orders/${order.id}/stages/${stage_no}/update`, patch);
      setStages(data.stages_detail);
      toast.success("Stage updated");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order.order_no} · {order.product_name}</DialogTitle>
          <div className="text-xs text-[#78716C]">Buyer: {order.party_name || "—"} · Qty: {order.total_qty}</div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {stages.map((s) => {
            const Icon = STAGE_ICONS[s.name] || Layers;
            const isCurrent = s.stage_no === order.current_stage_no;
            const isDone = !!s.completed_at;
            return (
              <div key={s.stage_no} className={`p-3 border rounded-lg ${isDone ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" : isCurrent ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200" : "bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]"}`} data-testid={`stage-${s.stage_no}`}>
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-[#2A4F4F]" />
                  <div className="flex-1">
                    <div className="font-semibold text-[#1C1917]">{s.stage_no}. {s.name}</div>
                    <div className="text-xs text-[#78716C]">
                      {isDone ? `✓ Completed ${(s.completed_at || "").slice(0, 10)}` : isCurrent ? "In progress" : "Pending"}
                      {s.completed_qty ? ` · ${s.completed_qty} done` : ""} {s.wastage_qty ? ` · ${s.wastage_qty} wastage` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" placeholder="Done" defaultValue={s.completed_qty || 0} onBlur={(e) => updateStage(s.stage_no, { completed_qty: Number(e.target.value) })} className="w-20 h-8 text-right" />
                    <Input type="number" placeholder="Waste" defaultValue={s.wastage_qty || 0} onBlur={(e) => updateStage(s.stage_no, { wastage_qty: Number(e.target.value) })} className="w-20 h-8 text-right" />
                    {!isDone && <Button size="sm" onClick={() => updateStage(s.stage_no, { completed: true, started: true })} className="bg-emerald-600 hover:bg-emerald-500 text-white">Complete</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter><Button onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================ JOB WORK =============================== */

function JobWork() {
  const { rows, loading, reload } = useCrudList("/manufacturing/job-work");
  const [editing, setEditing] = useState(null);

  const empty = {
    vendor_id: "", vendor_name: "", stage_name: "Embroidery",
    qty_sent: 0, qty_received: 0, rate: 0,
    sent_date: new Date().toISOString().slice(0, 10),
    expected_date: "", status: "sent", notes: "",
  };

  const save = async (payload) => {
    try {
      if (payload.id) await http.put(`/manufacturing/job-work/${payload.id}`, payload);
      else await http.post("/manufacturing/job-work", payload);
      toast.success("Job-work saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this job-work entry?")) return;
    try {
      await http.delete(`/manufacturing/job-work/${id}`);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-[#57534E]"><Users className="w-4 h-4" /> Outsourced work sent to vendors</div>
        <Button onClick={() => setEditing(empty)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white ml-auto" data-testid="jw-new-btn">
          <Plus className="w-4 h-4 mr-1" /> New Job Work
        </Button>
      </div>

      <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Vendor</th>
                <th className="text-left px-4 py-2 font-semibold">Stage</th>
                <th className="text-right px-4 py-2 font-semibold">Qty Sent</th>
                <th className="text-right px-4 py-2 font-semibold">Qty Received</th>
                <th className="text-right px-4 py-2 font-semibold">Rate</th>
                <th className="text-right px-4 py-2 font-semibold">Total</th>
                <th className="text-left px-4 py-2 font-semibold">Sent Date</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-6 text-[#78716C]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-[#78716C]">No job-work entries yet.</td></tr>
              ) : rows.map((jw) => (
                <tr key={jw.id} className="border-t border-[#E7E5DF] hover:bg-[#F9F8F6] dark:hover:bg-[#201D1B]">
                  <td className="px-4 py-2 font-medium text-[#1C1917]">{jw.vendor_name}</td>
                  <td className="px-4 py-2 text-[#57534E]">{jw.stage_name}</td>
                  <td className="px-4 py-2 text-right">{jw.qty_sent}</td>
                  <td className="px-4 py-2 text-right">{jw.qty_received}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(jw.rate)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatMoney(jw.total_amount)}</td>
                  <td className="px-4 py-2 text-[#57534E]">{jw.sent_date}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[jw.status === "received" ? "completed" : jw.status] || ""}`}>{jw.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(jw)}><Edit3 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(jw.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && <JobWorkDialog value={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function JobWorkDialog({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{value.id ? "Edit Job Work" : "New Job Work"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor Name*"><Input value={form.vendor_name} onChange={(e) => { set("vendor_name", e.target.value); set("vendor_id", form.vendor_id || `vendor-${e.target.value.toLowerCase().replace(/\s/g, "-")}`); }} data-testid="jw-vendor-name" /></Field>
          <Field label="Stage*"><Input value={form.stage_name} onChange={(e) => set("stage_name", e.target.value)} /></Field>
          <Field label="Qty Sent*"><Input type="number" value={form.qty_sent} onChange={(e) => set("qty_sent", Number(e.target.value))} /></Field>
          <Field label="Qty Received"><Input type="number" value={form.qty_received} onChange={(e) => set("qty_received", Number(e.target.value))} /></Field>
          <Field label="Rate per Piece"><Input type="number" step="0.01" value={form.rate} onChange={(e) => set("rate", Number(e.target.value))} /></Field>
          <Field label="Sent Date"><Input type="date" value={form.sent_date} onChange={(e) => set("sent_date", e.target.value)} /></Field>
          <Field label="Expected Date"><Input type="date" value={form.expected_date || ""} onChange={(e) => set("expected_date", e.target.value)} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background">
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="jw-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
