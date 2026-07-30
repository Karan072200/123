import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Printer, Save, ArrowLeft, MessageCircle, Mail, Edit3, ShieldCheck, Repeat, BookMarked } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const INVOICE_TYPES = [
  { key: "tax", label: "Tax Invoice" },
  { key: "gst", label: "GST Invoice" },
  { key: "proforma", label: "Proforma" },
  { key: "quotation", label: "Quotation" },
  { key: "challan", label: "Delivery Challan" },
  { key: "credit", label: "Credit Note" },
  { key: "debit", label: "Debit Note" },
];

const PAYMENT_MODES = ["cash", "bank", "upi", "card", "wallet", "credit"];

function emptyItem() {
  return { product_id: null, name: "", hsn: "", qty: 1, unit: "PCS", price: 0, discount_pct: 0, gst_rate: 18 };
}

export default function InvoiceCreate() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const location = useLocation();
  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !isEdit;
  const nav = useNavigate();
  const { user } = useAuth();
  const cur = user?.currency || "INR";

  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    invoice_type: sp.get("type") || "tax",
    customer_id: "",
    customer_name: "Walk-in Customer",
    items: [emptyItem()],
    discount_amount: 0,
    shipping: 0,
    gst_mode: "exclusive",
    payment_mode: "cash",
    account_id: "",
    paid_amount: null,
    notes: "",
    terms: "Thank you for your business!",
    invoice_date: new Date().toISOString().slice(0, 10),
    irn: "",
    irn_qr: "",
  });
  const [recurring, setRecurring] = useState({ enabled: false, day_of_month: 1 });
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState("");

  useEffect(() => {
    if (isView) return;
    http.get("/billing/invoice-templates").then((r) => setTemplates(r.data || [])).catch(() => {});
  }, [isView]);

  // Apply a template into the form
  const applyTemplate = (tplId) => {
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    setForm((f) => ({
      ...f,
      invoice_type: t.invoice_type || f.invoice_type,
      items: (t.items || []).map((it) => ({ ...emptyItem(), ...it })),
      discount_amount: t.discount_amount || 0,
      shipping: t.shipping || 0,
      gst_mode: t.gst_mode || f.gst_mode,
      payment_mode: t.payment_mode || f.payment_mode,
      notes: t.notes || f.notes,
      terms: t.terms || f.terms,
    }));
    setSelectedTpl(tplId);
    toast.success(`Template "${t.name}" loaded`);
  };

  // If user landed here via "Use Template" from templates page
  useEffect(() => {
    if (isView || isEdit) return;
    const pending = sessionStorage.getItem("am_use_template_id");
    if (pending && templates.length > 0) {
      applyTemplate(pending);
      sessionStorage.removeItem("am_use_template_id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length]);

  const saveAsTemplate = async () => {
    const name = window.prompt("Template name? (e.g. AMC Contract 2026)");
    if (!name || !name.trim()) return;
    try {
      await http.post("/billing/invoice-templates", {
        name: name.trim(),
        invoice_type: form.invoice_type,
        items: form.items,
        discount_amount: Number(form.discount_amount || 0),
        shipping: Number(form.shipping || 0),
        gst_mode: form.gst_mode,
        payment_mode: form.payment_mode,
        notes: form.notes,
        terms: form.terms,
      });
      toast.success(`Template "${name.trim()}" saved`);
      const { data } = await http.get("/billing/invoice-templates");
      setTemplates(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    }
  };

  useEffect(() => {
    if (isView) {
      http.get(`/billing/invoices/${id}`).then((r) => setInvoice(r.data)).catch(() => nav("/billing/invoices"));
      http.get("/billing/customers").then((r) => setCustomers(r.data || [])).catch(() => {});
    } else {
      Promise.all([
        http.get("/billing/customers"),
        http.get("/billing/products"),
        http.get("/accounts"),
      ]).then(([c, p, a]) => {
        setCustomers(c.data || []);
        setProducts(p.data || []);
        setAccounts(a.data || []);
        if (!isEdit && a.data?.[0]) setForm((f) => ({ ...f, account_id: a.data[0].id }));
      });
      if (isEdit) {
        http.get(`/billing/invoices/${id}`).then((r) => {
          const inv = r.data;
          setForm({
            invoice_type: inv.invoice_type || "tax",
            customer_id: inv.customer_id || "",
            customer_name: inv.customer_name || "Walk-in Customer",
            items: inv.items?.length ? inv.items : [emptyItem()],
            discount_amount: inv.discount_amount || 0,
            shipping: inv.shipping || 0,
            gst_mode: inv.gst_mode || "exclusive",
            payment_mode: inv.payment_mode || "cash",
            account_id: inv.account_id || "",
            paid_amount: inv.paid_amount ?? null,
            notes: inv.notes || "",
            terms: inv.terms || "",
            invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          });
        }).catch(() => nav("/billing/invoices"));
      }
    }
  }, [id, isEdit, isView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-print if query has print=1
    if (isView && invoice && sp.get("print") === "1") {
      setTimeout(() => window.print(), 500);
    }
  }, [invoice, sp, isView]);

  // Totals compute
  const totals = React.useMemo(() => {
    let subtotal = 0, taxable = 0, tax = 0;
    (form.items || []).forEach((it) => {
      const line = Number(it.qty || 0) * Number(it.price || 0);
      const afterDisc = line * (1 - Number(it.discount_pct || 0) / 100);
      const rate = Number(it.gst_rate || 0);
      if (form.gst_mode === "inclusive") {
        const lt = rate ? afterDisc / (1 + rate / 100) : afterDisc;
        taxable += lt; tax += afterDisc - lt;
      } else {
        taxable += afterDisc; tax += afterDisc * (rate / 100);
      }
      subtotal += afterDisc;
    });
    const total = taxable + tax + Number(form.shipping || 0) - Number(form.discount_amount || 0);
    return { subtotal, taxable, tax, total };
  }, [form.items, form.gst_mode, form.shipping, form.discount_amount]);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, patch) => setForm((f) => ({
    ...f,
    items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
  }));

  const pickProduct = (i, productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(i, {
      product_id: p.id, name: p.name, hsn: p.hsn || "",
      unit: p.unit, price: p.price, gst_rate: p.gst_rate,
    });
  };

  const save = async () => {
    if (form.items.filter((it) => it.name).length === 0) {
      toast.error("Ek item toh add karo");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || null,
        account_id: form.account_id || null,
        items: form.items.filter((it) => it.name).map((it) => ({
          ...it,
          qty: Number(it.qty), price: Number(it.price),
          discount_pct: Number(it.discount_pct || 0),
          gst_rate: Number(it.gst_rate || 0),
        })),
        discount_amount: Number(form.discount_amount || 0),
        shipping: Number(form.shipping || 0),
        status: "final",
        invoice_date: new Date(form.invoice_date).toISOString(),
      };
      const { data } = isEdit
        ? await http.patch(`/billing/invoices/${id}`, payload)
        : await http.post("/billing/invoices", payload);
      toast.success(`Invoice ${data.invoice_number} ${isEdit ? "updated" : "saved"}!`);
      // Optionally create a monthly recurring template for new invoices
      if (!isEdit && recurring.enabled) {
        try {
          await http.post("/billing/recurring-invoices", {
            invoice_type: payload.invoice_type,
            customer_id: payload.customer_id,
            customer_name: payload.customer_name,
            items: payload.items,
            discount_amount: payload.discount_amount,
            shipping: payload.shipping,
            gst_mode: payload.gst_mode,
            payment_mode: "credit",
            account_id: payload.account_id,
            notes: payload.notes,
            terms: payload.terms,
            day_of_month: Number(recurring.day_of_month) || 1,
            enabled: true,
          });
          toast.success(`Monthly recurring set — auto-bills every ${recurring.day_of_month} of the month`);
        } catch (rerr) {
          toast.error("Invoice saved but recurring template failed");
        }
      }
      nav(`/billing/invoices/${data.id}/view`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  // ============ VIEW / PRINT MODE ============
  if (isView) {
    if (!invoice) return <div className="p-6">Loading...</div>;

    let company = {};
    try { company = JSON.parse(localStorage.getItem("am_company_info") || "{}"); } catch {}
    const customer = customers.find((c) => c.id === invoice.customer_id);
    const invoiceTypeLabel = {
      tax: "Tax Invoice", gst: "GST Invoice", proforma: "Proforma Invoice",
      quotation: "Quotation", challan: "Delivery Challan",
      credit: "Credit Note", debit: "Debit Note",
    }[invoice.invoice_type] || `${invoice.invoice_type} Invoice`;
    const shareMsg = `Namaste ${invoice.customer_name || ""},\n\nAapka invoice ${invoice.invoice_number} ready hai:\nAmount: ${formatMoney(invoice.total, cur)}\n${invoice.balance_due > 0 ? "Balance Due: " + formatMoney(invoice.balance_due, cur) + "\n" : "Paid ✓\n"}\nDetails: ${window.location.origin}/billing/invoices/${invoice.id}/view\n\nDhanyavaad!\n${company.company_name || ""}`;
    const shareWhatsApp = () => {
      const phone = (customer?.phone || "").replace(/\D/g, "");
      window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(shareMsg)}` : `https://wa.me/?text=${encodeURIComponent(shareMsg)}`, "_blank");
    };
    const shareEmail = () => {
      window.location.href = `mailto:${customer?.email || ""}?subject=${encodeURIComponent("Invoice " + invoice.invoice_number)}&body=${encodeURIComponent(shareMsg)}`;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
          <Button variant="outline" onClick={() => nav("/billing/invoices")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => nav(`/billing/invoices/${invoice.id}/edit`)} data-testid="edit-invoice-btn"
              variant="outline" className="border-[#B8763A] text-[#B8763A] hover:bg-[#E8B365]/10">
              <Edit3 className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button onClick={shareWhatsApp} data-testid="share-whatsapp-btn"
              className="bg-[#25D366] hover:bg-[#1DA851] text-white">
              <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
            </Button>
            <Button onClick={shareEmail} data-testid="share-email-btn" variant="outline" className="border-[#2A4F4F] text-[#2A4F4F]">
              <Mail className="w-4 h-4 mr-1" /> Email
            </Button>
            <Button onClick={() => window.print()} data-testid="print-invoice-btn"
              className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
              <Printer className="w-4 h-4 mr-1" /> Print / PDF
            </Button>
          </div>
        </div>
        <div className="bg-white p-8 border border-[#E7E5DF] rounded-xl max-w-3xl mx-auto print:border-0 print:shadow-none print:p-4"
          data-testid="invoice-view">
          {/* HEADER — Business identity */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-[#2A4F4F]">
            <div className="flex items-start gap-4 min-w-0">
              {company.logo ? (
                <img src={company.logo} alt="logo" className="h-16 w-16 object-contain rounded border border-[#E7E5DF] p-1 bg-white shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded bg-[#2A4F4F] text-white flex items-center justify-center font-heading font-bold text-xl shrink-0">
                  {(company.company_name || user?.name || "AM").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-extrabold text-[#1C1917] leading-tight">{company.company_name || user?.name || "Apka Munim"}</h1>
                {company.gstin && (
                  <p className="text-xs text-[#1C1917] font-semibold mt-0.5">
                    GSTIN: <span className="font-mono">{company.gstin}</span>
                  </p>
                )}
                {company.address && <p className="text-xs text-[#57534E] whitespace-pre-wrap max-w-xs mt-0.5">{company.address}</p>}
                <div className="text-xs text-[#57534E] mt-0.5 space-x-2">
                  {company.phone && <span>Ph: {company.phone}</span>}
                  {company.email && <span>· {company.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="inline-block bg-[#2A4F4F] text-white px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold">
                {invoiceTypeLabel}
              </div>
              <div className="font-mono font-extrabold text-lg mt-1 text-[#1C1917]">{invoice.invoice_number}</div>
              <div className="text-xs text-[#78716C]">
                Date: {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}
              </div>
              {invoice.due_date && (
                <div className="text-xs text-[#78716C]">
                  Due: {new Date(invoice.due_date).toLocaleDateString("en-IN")}
                </div>
              )}
            </div>
          </div>

          {/* PARTY + PAYMENT */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="border border-[#E7E5DF] rounded-lg p-3">
              <div className="text-[10px] uppercase text-[#78716C] mb-1 font-bold tracking-wider">Bill To</div>
              <div className="font-semibold text-[#1C1917]">{invoice.customer_name || "Walk-in Customer"}</div>
              {customer?.gstin && (
                <div className="text-xs text-[#57534E] mt-0.5">GSTIN: <span className="font-mono">{customer.gstin}</span></div>
              )}
              {customer?.address && <div className="text-xs text-[#57534E] whitespace-pre-wrap mt-0.5">{customer.address}</div>}
              {customer?.phone && <div className="text-xs text-[#57534E]">Ph: {customer.phone}</div>}
              {customer?.email && <div className="text-xs text-[#57534E]">{customer.email}</div>}
            </div>
            <div className="border border-[#E7E5DF] rounded-lg p-3 text-right">
              <div className="text-[10px] uppercase text-[#78716C] mb-1 font-bold tracking-wider">Payment</div>
              <div className="font-semibold text-[#1C1917]">{(invoice.payment_mode || "").toUpperCase() || "—"}</div>
              <div className="text-xs text-[#57534E] mt-0.5">
                {invoice.gst_mode === "inclusive" ? "GST Inclusive" : "GST Exclusive"}
              </div>
              {invoice.balance_due > 0 ? (
                <div className="text-xs text-[#B15039] font-bold mt-1">Balance Due: {formatMoney(invoice.balance_due, cur)}</div>
              ) : invoice.total > 0 ? (
                <div className="text-xs text-[#3B6446] font-bold mt-1">PAID IN FULL</div>
              ) : null}
            </div>
          </div>

          {/* ITEM TABLE */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-[#1C1917] text-xs uppercase bg-[#F9F8F6]">
                <th className="text-left py-2 px-2 w-8">#</th>
                <th className="text-left py-2 px-2">Item / Description</th>
                <th className="text-left py-2 px-2 hidden sm:table-cell">HSN/SAC</th>
                <th className="text-right py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">Rate</th>
                <th className="text-right py-2 px-2">GST%</th>
                <th className="text-right py-2 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((it, i) => (
                <tr key={i} className="border-b border-[#E7E5DF] page-break-inside-avoid">
                  <td className="py-2 px-2 text-[#78716C]">{i + 1}</td>
                  <td className="py-2 px-2">{it.name}</td>
                  <td className="py-2 px-2 text-xs text-[#78716C] hidden sm:table-cell font-mono">{it.hsn || "—"}</td>
                  <td className="text-right py-2 px-2">{it.qty} {it.unit}</td>
                  <td className="text-right py-2 px-2">{formatMoney(it.price, cur)}</td>
                  <td className="text-right py-2 px-2">{it.gst_rate || 0}%</td>
                  <td className="text-right py-2 px-2 font-medium">{formatMoney(it._line_total || it.qty * it.price, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="ml-auto max-w-xs text-sm space-y-1 mb-6">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(invoice.taxable, cur)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{formatMoney(invoice.tax, cur)}</span></div>
            {invoice.shipping > 0 && <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(invoice.shipping, cur)}</span></div>}
            {invoice.discount_amount > 0 && <div className="flex justify-between text-[#B15039]"><span>Discount</span><span>-{formatMoney(invoice.discount_amount, cur)}</span></div>}
            <div className="flex justify-between border-t-2 border-[#1C1917] pt-2 text-lg font-heading font-bold">
              <span>Grand Total</span><span>{formatMoney(invoice.total, cur)}</span>
            </div>
            <div className="flex justify-between text-[#3B6446]">
              <span>Paid</span><span>{formatMoney(invoice.paid_amount || 0, cur)}</span>
            </div>
            {invoice.balance_due > 0 && (
              <div className="flex justify-between text-[#B15039] font-bold">
                <span>Balance Due</span><span>{formatMoney(invoice.balance_due, cur)}</span>
              </div>
            )}
          </div>

          {/* NOTES */}
          {invoice.notes && (
            <div className="mt-6 text-xs text-[#57534E] border border-[#E7E5DF] rounded-md p-3">
              <div className="font-bold uppercase tracking-wider text-[10px] text-[#78716C] mb-1">Notes</div>
              <div className="whitespace-pre-wrap">{invoice.notes}</div>
            </div>
          )}

          {/* SIGNATURE */}
          {company.signature && (
            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <img src={company.signature} alt="signature" className="h-12 ml-auto object-contain" />
                <div className="border-t border-[#1C1917] w-40 mt-1 pt-1 text-xs">Authorized Signature</div>
                {company.company_name && (
                  <div className="text-[10px] text-[#78716C]">for {company.company_name}</div>
                )}
              </div>
            </div>
          )}

          {/* UPI QR — auto-generated from company UPI ID if set */}
          {company.upi_id && invoice.balance_due > 0 && (
            <div className="mt-6 border border-[#E7E5DF] rounded-lg p-4 flex items-center gap-4 page-break-inside-avoid">
              <div className="shrink-0 bg-white p-1 border border-[#E7E5DF] rounded">
                <QRCodeSVG
                  value={`upi://pay?pa=${encodeURIComponent(company.upi_id)}&pn=${encodeURIComponent(company.upi_name || company.company_name || "Payee")}&am=${Number(invoice.balance_due || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Invoice " + invoice.invoice_number)}`}
                  size={112}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-xs">
                <div className="text-[10px] uppercase text-[#78716C] tracking-wider font-bold">Scan &amp; Pay via UPI</div>
                <div className="font-mono text-sm text-[#1C1917] mt-0.5">{company.upi_id}</div>
                {(company.upi_name || company.company_name) && (
                  <div className="text-[11px] text-[#57534E]">{company.upi_name || company.company_name}</div>
                )}
                <div className="mt-1 font-heading font-bold text-[#2A4F4F]">Amount: {formatMoney(invoice.balance_due, cur)}</div>
                <div className="text-[10px] text-[#78716C] mt-1">Works in PhonePe, GPay, Paytm and any UPI app.</div>
              </div>
            </div>
          )}

          {/* E-Invoice IRN (GST government-signed) */}
          {(invoice.irn || invoice.irn_qr) && (
            <div className="mt-4 border border-[#2A4F4F]/30 rounded-lg p-3 bg-[#2A4F4F]/5 flex items-start gap-3 page-break-inside-avoid">
              {invoice.irn_qr ? (
                <img src={invoice.irn_qr} alt="IRN QR" className="h-24 w-24 object-contain bg-white border border-[#E7E5DF] rounded p-1 shrink-0" />
              ) : null}
              <div className="text-xs min-w-0">
                <div className="text-[10px] uppercase text-[#2A4F4F] tracking-wider font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Government-Signed e-Invoice
                </div>
                {invoice.irn && (
                  <div className="font-mono break-all text-[11px] leading-snug text-[#1C1917] mt-1">
                    IRN: {invoice.irn}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TERMS & CONDITIONS FOOTER */}
          {(invoice.terms || company.invoice_footer) && (
            <div className="mt-8 pt-4 border-t border-[#E7E5DF] text-xs text-[#57534E] space-y-2 page-break-inside-avoid">
              {invoice.terms && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-[#78716C] mb-1">Terms &amp; Conditions</div>
                  <div className="whitespace-pre-wrap leading-snug">{invoice.terms}</div>
                </div>
              )}
              {company.invoice_footer && (
                <div className="pt-2 border-t border-dashed border-[#E7E5DF]">
                  <div className="whitespace-pre-wrap leading-snug">{company.invoice_footer}</div>
                </div>
              )}
            </div>
          )}

          {/* BRAND FOOTER */}
          <div className="mt-6 pt-4 border-t border-[#E7E5DF] text-center text-[10px] text-[#A8A29E]">
            This is a computer-generated invoice · Powered by Apka Munim · apkamunim.com
          </div>
        </div>
      </div>
    );
  }

  // ============ CREATE MODE ============
  return (
    <div className="space-y-4" data-testid="invoice-create-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#2A4F4F]" /> {isEdit ? "Invoice Edit" : "Naya Invoice"}
        </h1>
        <Button onClick={save} disabled={saving} data-testid="invoice-save-btn"
          className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : (isEdit ? "Update Invoice" : "Save Invoice")}
        </Button>
      </div>

      {/* Templates bar (create-mode only) */}
      {!isView && !isEdit && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <BookMarked className="w-4 h-4 text-[#2A4F4F]" />
            <select
              value={selectedTpl}
              onChange={(e) => applyTemplate(e.target.value)}
              data-testid="invoice-load-template"
              className="h-9 px-2 border border-[#E7E5DF] rounded-md bg-white text-sm flex-1"
            >
              <option value="">Load from template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={saveAsTemplate}
            data-testid="invoice-save-template-btn"
            className="border-[#2A4F4F] text-[#2A4F4F] hover:bg-[#2A4F4F]/5"
          >
            <BookMarked className="w-4 h-4 mr-1" /> Save as Template
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
          <div>
            <Label>Invoice Type</Label>
            <select value={form.invoice_type} onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
              className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md bg-white text-sm">
              {INVOICE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Customer</Label>
            <select value={form.customer_id} onChange={(e) => {
              const c = customers.find((x) => x.id === e.target.value);
              setForm({ ...form, customer_id: e.target.value, customer_name: c?.name || "Walk-in Customer" });
            }} className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md bg-white text-sm">
              <option value="">Walk-in Customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          </div>
          <div>
            <Label>GST Mode</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => setForm({ ...form, gst_mode: "exclusive" })}
                className={`h-9 rounded-md text-xs font-semibold ${form.gst_mode === "exclusive" ? "bg-[#2A4F4F] text-white" : "bg-[#F2F0EA] text-[#57534E]"}`}>
                Exclusive
              </button>
              <button onClick={() => setForm({ ...form, gst_mode: "inclusive" })}
                className={`h-9 rounded-md text-xs font-semibold ${form.gst_mode === "inclusive" ? "bg-[#2A4F4F] text-white" : "bg-[#F2F0EA] text-[#57534E]"}`}>
                Inclusive
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Items</h3>
            <Button size="sm" variant="outline" onClick={addItem} data-testid="add-item-btn">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-[#F9F8F6] rounded-lg" data-testid={`item-row-${i}`}>
                <div className="col-span-12 md:col-span-4">
                  <Label className="text-[10px] uppercase text-[#78716C]">Item</Label>
                  {products.length > 0 ? (
                    <select value={it.product_id || ""} onChange={(e) => pickProduct(i, e.target.value)}
                      className="w-full h-9 px-2 border border-[#E7E5DF] rounded-md text-xs bg-white">
                      <option value="">-- Custom --</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : null}
                  <Input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })}
                    placeholder="Item name" className="mt-1 h-9 text-sm" data-testid={`item-name-${i}`} />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <Label className="text-[10px] uppercase text-[#78716C]">Qty</Label>
                  <Input type="number" value={it.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} className="h-9" data-testid={`item-qty-${i}`} />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-[10px] uppercase text-[#78716C]">Rate</Label>
                  <Input type="number" value={it.price} onChange={(e) => updateItem(i, { price: e.target.value })} className="h-9" data-testid={`item-price-${i}`} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-[10px] uppercase text-[#78716C]">Disc%</Label>
                  <Input type="number" value={it.discount_pct} onChange={(e) => updateItem(i, { discount_pct: e.target.value })} className="h-9" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-[10px] uppercase text-[#78716C]">GST%</Label>
                  <Input type="number" value={it.gst_rate} onChange={(e) => updateItem(i, { gst_rate: e.target.value })} className="h-9" />
                </div>
                <div className="col-span-10 md:col-span-2 text-right pt-4">
                  <div className="text-sm font-semibold">{formatMoney(Number(it.qty || 0) * Number(it.price || 0) * (1 - Number(it.discount_pct || 0) / 100), cur)}</div>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <button onClick={() => removeItem(i)} className="text-[#B15039] p-1.5 hover:bg-[#D96C52]/10 rounded" data-testid={`remove-item-${i}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
          {(form.invoice_type === "gst" || form.invoice_type === "tax") && (
            <div className="pt-2 border-t border-[#E7E5DF] space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2A4F4F]" />
                <Label className="text-xs font-bold uppercase tracking-wider text-[#78716C]">E-Invoice (Optional)</Label>
              </div>
              <div>
                <Label className="text-[10px]">IRN (Invoice Reference Number)</Label>
                <Input value={form.irn} onChange={(e) => setForm({ ...form, irn: e.target.value })}
                  data-testid="invoice-irn-input"
                  placeholder="64-char IRN from GST portal" className="font-mono text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">IRN QR (upload signed QR image)</Label>
                <input
                  type="file"
                  accept="image/*"
                  data-testid="invoice-irn-qr-upload"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 1024 * 1024) { toast.error("File 1MB se kam honi chahiye"); return; }
                    const r = new FileReader();
                    r.onload = () => setForm((s) => ({ ...s, irn_qr: r.result }));
                    r.readAsDataURL(f);
                  }}
                  className="text-xs mt-1"
                />
                {form.irn_qr && <img src={form.irn_qr} alt="irn qr" className="h-16 mt-1 border border-[#E7E5DF] rounded" />}
              </div>
            </div>
          )}
          {!isEdit && (
            <div className="pt-2 border-t border-[#E7E5DF]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  data-testid="recurring-toggle"
                  checked={recurring.enabled}
                  onChange={(e) => setRecurring((s) => ({ ...s, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#2A4F4F]" />
                <Repeat className="w-4 h-4 text-[#2A4F4F]" />
                <span className="text-sm font-semibold text-[#1C1917]">Save as monthly recurring</span>
              </label>
              {recurring.enabled && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-[#78716C]">Auto-generate on day</span>
                  <select
                    value={recurring.day_of_month}
                    onChange={(e) => setRecurring((s) => ({ ...s, day_of_month: Number(e.target.value) }))}
                    data-testid="recurring-day-select"
                    className="h-8 px-2 border border-[#E7E5DF] rounded-md bg-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <span className="text-[#78716C]">of every month</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E7E5DF] rounded-xl p-4 space-y-3">
          <div>
            <Label>Payment Mode</Label>
            <select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md bg-white text-sm">
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          {form.payment_mode !== "credit" && accounts.length > 0 && (
            <div>
              <Label>Deposit To Account</Label>
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className="w-full h-10 px-3 border border-[#E7E5DF] rounded-md bg-white text-sm">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Shipping</Label>
              <Input type="number" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} />
            </div>
            <div><Label>Extra Disc</Label>
              <Input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-[#2A4F4F] to-[#1F3939] text-white rounded-xl p-5">
          <div className="text-xs uppercase opacity-80 tracking-wider">Totals</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(totals.taxable, cur)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{formatMoney(totals.tax, cur)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(Number(form.shipping || 0), cur)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(Number(form.discount_amount || 0), cur)}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/30 flex justify-between items-baseline">
            <span className="uppercase text-xs opacity-80">Grand Total</span>
            <span className="font-heading text-3xl font-bold" data-testid="invoice-total">{formatMoney(totals.total, cur)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
