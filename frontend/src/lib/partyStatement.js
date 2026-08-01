import { http } from "@/lib/api";
import { toast } from "sonner";

/**
 * Download a party's statement PDF (WhatsApp-ready) and trigger a browser save.
 * Shared by CustomerLedger, SupplierLedger and any other page that lists parties.
 */
export async function downloadPartyStatement(partyId, name) {
  try {
    const res = await http.get(`/billing/parties/${partyId}/statement.pdf`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${(name || "party").replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Statement downloaded");
  } catch (e) {
    toast.error("Statement download failed");
  }
}
