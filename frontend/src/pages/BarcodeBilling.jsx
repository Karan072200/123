import React, { useState, useEffect, useCallback, useMemo } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Barcode, ScanLine, Plus, Trash2, Save, Receipt } from "lucide-react";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import ThermalInvoice from "@/components/billing/ThermalInvoice";

/**
 * Barcode Billing (POS) — Phase 6.
 *
 * Fast retail counter workflow:
 *   1. Cashier scans product barcode (USB scanner emulates keyboard).
 *   2. Product is auto-fetched from the products collection.
 *      If found, it's added as a cart line; if not, cashier is prompted
 *      to add manually.
 *   3. Cart shows running total (subtotal + GST + grand total).
 *   4. Save creates an invoice via existing /api/invoices endpoint.
 *   5. On save, thermal receipt preview + Print (58mm/80mm) + WhatsApp share.
 */
export default function BarcodeBilling() {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "Walk-in", phone: "" });
  const [scanFeedback, setScanFeedback] = useState("");
  const [manual, setManual] = useState("");
  const [width, setWidth] = useState("80mm");
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({ name: "", gstin: "", address: "", phone: "" });

  // Load business info from /me
  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get("/auth/me");
        setBusinessInfo({
          name: data.business_name || data.name || "Apka Munim",
          gstin: data.gstin || "",
          address: data.address || "",
          phone: data.phone || "",
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  const lookupBarcode = useCallback(async (code) => {
    setScanFeedback(`Scanning: ${code}…`);
    try {
      // Try /products search by barcode
      const { data } = await http.get("/products", { params: { search: code } });
      const items = data.items || data || [];
      const match = items.find((p) => p.barcode === code || p.sku === code) || items[0];
      if (match) {
        setCart((c) => addToCart(c, {
          product_id: match.id,
          name: match.name,
          qty: 1,
          rate: Number(match.price || match.rate || match.selling_price || 0),
          gst_pct: Number(match.gst_pct || match.tax_pct || 0),
        }));
        setScanFeedback(`✓ Added: ${match.name}`);
        setTimeout(() => setScanFeedback(""), 1500);
      } else {
        setScanFeedback(`⚠ No product for "${code}" — add manually`);
        setManual(code);
      }
    } catch (e) {
      setScanFeedback(`✗ ${formatApiError(e?.response?.data?.detail) || "Lookup failed"}`);
    }
  }, []);

  useBarcodeScanner({ onScan: lookupBarcode });

  const addManual = () => {
    if (!manual) return;
    setCart((c) => addToCart(c, { product_id: manual, name: manual, qty: 1, rate: 0, gst_pct: 0 }));
    setManual("");
  };

  const updateLine = (idx, key, val) => setCart((c) => c.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  const removeLine = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const clear = () => { setCart([]); setSavedInvoice(null); setCustomer({ name: "Walk-in", phone: "" }); };

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    cart.forEach((l) => {
      const line = Number(l.qty) * Number(l.rate);
      sub += line;
      tax += line * (Number(l.gst_pct) / 100);
    });
    return { subtotal: round2(sub), tax: round2(tax), grand: round2(sub + tax) };
  }, [cart]);

  const save = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    try {
      const payload = {
        type: "tax-invoice",
        invoice_number: `POS-${Date.now().toString().slice(-8)}`,
        date: new Date().toISOString().slice(0, 10),
        party_name: customer.name,
        party_phone: customer.phone,
        items: cart.map((l) => ({
          name: l.name,
          quantity: Number(l.qty),
          price: Number(l.rate),
          rate: Number(l.rate),
          amount: round2(Number(l.qty) * Number(l.rate)),
          gst_pct: Number(l.gst_pct),
          hsn: "",
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total_tax: totals.tax,
        grand_total: totals.grand,
        total: totals.grand,
        status: "paid",
        payment_mode: "cash",
        notes: "POS barcode sale",
      };
      const { data } = await http.post("/invoices", payload);
      toast.success("Invoice saved");
      setSavedInvoice({ ...payload, ...data });
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#151312]" data-testid="barcode-billing-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
              <Barcode className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C1917] font-heading">Barcode Billing (POS)</h1>
          </div>
          <p className="text-sm text-[#57534E]">Scan products with USB barcode scanner · Thermal print · WhatsApp share</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: cart */}
          <Card className="lg:col-span-2 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
            <div className="p-4 border-b border-[#E7E5DF]">
              <div className="flex items-center gap-3">
                <ScanLine className={`w-5 h-5 ${scanFeedback ? "text-emerald-500 animate-pulse" : "text-[#78716C]"}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#1C1917]">Scan or type a barcode</div>
                  <div className="text-xs text-[#78716C] min-h-4">{scanFeedback || "Scanner active — plug in a USB scanner and start scanning."}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && manual && lookupBarcode(manual)}
                  placeholder="Barcode / SKU"
                  className="max-w-xs"
                  data-testid="barcode-input"
                />
                <Button onClick={() => manual && lookupBarcode(manual)} variant="outline" data-testid="barcode-lookup-btn">Lookup</Button>
                <Button onClick={addManual} variant="outline">Add as new line</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
                  <tr>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-3 py-2 w-20">Qty</th>
                    <th className="text-right px-3 py-2 w-24">Rate</th>
                    <th className="text-right px-3 py-2 w-20">GST %</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#78716C]">Scan a barcode or type it above to start billing.</td></tr>
                  ) : cart.map((l, i) => (
                    <tr key={i} className="border-t border-[#E7E5DF]" data-testid={`cart-row-${i}`}>
                      <td className="px-3 py-1"><Input value={l.name} onChange={(e) => updateLine(i, "name", e.target.value)} className="h-8" /></td>
                      <td className="px-3 py-1"><Input type="number" step="1" value={l.qty} onChange={(e) => updateLine(i, "qty", Number(e.target.value))} className="h-8 text-right" data-testid={`cart-qty-${i}`} /></td>
                      <td className="px-3 py-1"><Input type="number" step="0.01" value={l.rate} onChange={(e) => updateLine(i, "rate", Number(e.target.value))} className="h-8 text-right" /></td>
                      <td className="px-3 py-1"><Input type="number" step="0.5" value={l.gst_pct} onChange={(e) => updateLine(i, "gst_pct", Number(e.target.value))} className="h-8 text-right" /></td>
                      <td className="px-3 py-1 text-right font-medium">{formatMoney(round2(l.qty * l.rate * (1 + l.gst_pct / 100)))}</td>
                      <td className="px-3 py-1"><Button size="sm" variant="ghost" onClick={() => removeLine(i)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Right: customer + totals + save */}
          <div className="space-y-4">
            <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
              <h3 className="font-semibold text-[#1C1917] mb-3">Customer</h3>
              <div className="space-y-3">
                <div><Label className="text-xs text-[#57534E]">Name</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} data-testid="pos-cust-name" /></div>
                <div><Label className="text-xs text-[#57534E]">Phone (for WhatsApp)</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+91..." data-testid="pos-cust-phone" /></div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
              <h3 className="font-semibold text-[#1C1917] mb-3">Total</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-[#57534E]">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[#57534E]">GST</span><span>{formatMoney(totals.tax)}</span></div>
                <div className="border-t border-[#E7E5DF] pt-2 flex justify-between text-lg font-bold text-[#1C1917]" data-testid="pos-grand-total"><span>Grand Total</span><span>{formatMoney(totals.grand)}</span></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={save} disabled={cart.length === 0} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="pos-save-btn">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button onClick={clear} variant="outline">New</Button>
              </div>
              <div className="mt-3 flex gap-2 items-center">
                <Label className="text-xs text-[#57534E]">Print size:</Label>
                <select value={width} onChange={(e) => setWidth(e.target.value)} className="h-8 border border-input rounded-md px-2 text-xs bg-background">
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm</option>
                </select>
              </div>
            </Card>

            {savedInvoice && (
              <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid="thermal-invoice-container">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-[#1C1917]">Receipt · {savedInvoice.invoice_number}</h3>
                </div>
                <ThermalInvoice
                  invoice={savedInvoice}
                  businessName={businessInfo.name}
                  businessAddress={businessInfo.address}
                  businessGstin={businessInfo.gstin}
                  businessPhone={businessInfo.phone}
                  width={width}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function addToCart(cart, line) {
  const existing = cart.findIndex((l) => l.product_id === line.product_id);
  if (existing >= 0) {
    const next = [...cart];
    next[existing] = { ...next[existing], qty: Number(next[existing].qty) + Number(line.qty) };
    return next;
  }
  return [...cart, line];
}

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }
