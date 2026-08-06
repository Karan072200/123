import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle, Send, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * ThermalInvoice — 58mm / 80mm receipt printer layout with WhatsApp share.
 *
 * Renders the invoice as a monospace-style receipt sized for a thermal
 * printer (POS-58 or POS-80). When the "Print" button is clicked, only
 * the receipt element is printed via a print-specific stylesheet.
 *
 * Props:
 *   invoice     — {invoice_number, date, party_name, party_phone, items:[{name,qty,rate,amount}], subtotal, tax, grand_total, ...}
 *   businessName, businessAddress, businessGstin, businessPhone
 *   width       — "58mm" | "80mm" (defaults to 80mm)
 *
 * Usage:
 *   <ThermalInvoice invoice={inv} businessName="Demo" width="80mm" />
 */
export default function ThermalInvoice({
  invoice,
  businessName = "Apka Munim",
  businessAddress = "",
  businessGstin = "",
  businessPhone = "",
  width = "80mm",
}) {
  const printRef = useRef(null);

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const subtotal = Number(invoice?.subtotal || 0);
  const tax = Number(invoice?.tax || invoice?.total_tax || 0);
  const grand = Number(invoice?.grand_total || subtotal + tax);

  const print = () => {
    // Print only the thermal element by opening a new window with just its HTML.
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) { toast.error("Popup blocked — please allow popups to print"); return; }
    w.document.write(`
      <html><head><title>${invoice?.invoice_number || "Receipt"}</title>
        <style>
          @page { size: ${width} auto; margin: 3mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Courier New', 'Menlo', monospace; font-size: 11px; margin: 0; padding: 0; color: #000; }
          .receipt { width: ${width === "58mm" ? "54mm" : "76mm"}; margin: 0 auto; }
          .center { text-align: center; }
          .row { display: flex; justify-content: space-between; }
          .line { border-top: 1px dashed #333; margin: 3px 0; }
          .b { font-weight: bold; }
          .sm { font-size: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { padding: 1px 0; text-align: left; }
          th.r, td.r { text-align: right; }
          h2 { font-size: 14px; margin: 2px 0; }
          h3 { font-size: 11px; margin: 2px 0; font-weight: bold; }
        </style>
      </head><body onload="window.print(); setTimeout(function(){window.close();}, 200);">
      <div class="receipt">${html}</div>
      </body></html>`);
    w.document.close();
  };

  const shareWhatsApp = () => {
    const phone = (invoice?.party_phone || "").replace(/[^0-9]/g, "");
    const lines = [];
    lines.push(`*${businessName}*`);
    if (businessGstin) lines.push(`GSTIN: ${businessGstin}`);
    lines.push("");
    lines.push(`Invoice: ${invoice?.invoice_number || "-"}`);
    lines.push(`Date: ${(invoice?.date || "").slice(0, 10)}`);
    if (invoice?.party_name) lines.push(`To: ${invoice.party_name}`);
    lines.push("");
    lines.push("*Items:*");
    items.forEach((it) => {
      lines.push(`• ${it.name || it.description} x${it.qty || it.quantity} = ₹${Number(it.amount || it.total || 0).toFixed(2)}`);
    });
    lines.push("");
    lines.push(`Subtotal: ₹${subtotal.toFixed(2)}`);
    if (tax) lines.push(`Tax: ₹${tax.toFixed(2)}`);
    lines.push(`*Total: ₹${grand.toFixed(2)}*`);
    lines.push("");
    lines.push("Thank you for your business! 🙏");

    const msg = encodeURIComponent(lines.join("\n"));
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  const shareSMS = () => {
    const phone = (invoice?.party_phone || "").replace(/[^0-9]/g, "");
    const msg = `${businessName}\nInv ${invoice?.invoice_number || ""} · ${(invoice?.date || "").slice(0, 10)}\nTotal: ₹${grand.toFixed(2)}\nThank you!`;
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_self");
  };

  return (
    <div className="space-y-3">
      {/* Preview (on-screen, larger) */}
      <div className="mx-auto bg-white text-black p-3 border border-[#E7E5DF] rounded shadow-sm" style={{ width: width === "58mm" ? "220px" : "300px", fontFamily: "'Courier New', monospace", fontSize: "11px" }} data-testid="thermal-preview">
        <div ref={printRef}>
          <div className="center b" style={{ fontSize: "14px" }}>{businessName}</div>
          {businessAddress && <div className="center sm">{businessAddress}</div>}
          {businessGstin && <div className="center sm">GSTIN: {businessGstin}</div>}
          {businessPhone && <div className="center sm">Ph: {businessPhone}</div>}
          <div className="line" />
          <div className="row"><span>Inv: {invoice?.invoice_number || "-"}</span></div>
          <div className="row"><span>Date: {(invoice?.date || "").slice(0, 10)}</span></div>
          {invoice?.party_name && <div>To: {invoice.party_name}</div>}
          <div className="line" />
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="r">Qty</th>
                <th className="r">Rate</th>
                <th className="r">Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{(it.name || it.description || "").slice(0, 14)}</td>
                  <td className="r">{it.qty || it.quantity || 0}</td>
                  <td className="r">{Number(it.rate || it.price || 0).toFixed(0)}</td>
                  <td className="r">{Number(it.amount || it.total || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="line" />
          <div className="row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {tax > 0 && <div className="row"><span>Tax</span><span>₹{tax.toFixed(2)}</span></div>}
          <div className="line" />
          <div className="row b" style={{ fontSize: "13px" }}><span>TOTAL</span><span>₹{grand.toFixed(2)}</span></div>
          <div className="line" />
          <div className="center sm">Thank you for your business!</div>
          <div className="center sm">apkamunim.com</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={print} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="thermal-print-btn">
          <Printer className="w-4 h-4 mr-1" /> Print ({width})
        </Button>
        <Button onClick={shareWhatsApp} variant="outline" className="text-emerald-700 border-emerald-300" data-testid="thermal-whatsapp-btn">
          <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
        </Button>
        <Button onClick={shareSMS} variant="outline" data-testid="thermal-sms-btn">
          <Send className="w-4 h-4 mr-1" /> SMS
        </Button>
      </div>
    </div>
  );
}
