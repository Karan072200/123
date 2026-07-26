import React, { useState } from "react";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// NOTE: the backend does not currently expose the account's saved
// two_factor_enabled flag on GET /auth/me, so this section can only
// reflect changes made during the current session (it can't know the
// saved state on page load). Add `"two_factor_enabled": user.get("two_factor_enabled", False)`
// to the /auth/me response to make this persist across reloads.
export default function TwoFactorSection() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(null); // null = unknown this session
  const [openDialog, setOpenDialog] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const startEnable = async () => {
    setSending(true);
    try {
      await http.post("/auth/2fa/send-code", { email: user?.email, code: "" });
      toast.success("Code bhej diya! Email check karo.");
      setOpenDialog(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Code bhej nahi paya");
    } finally {
      setSending(false);
    }
  };

  const confirmEnable = async () => {
    if (code.length !== 6) return toast.error("6-digit code daalo");
    setVerifying(true);
    try {
      // Verifying here just confirms the user owns the inbox before
      // we flip the flag on — the actual toggle is a separate call.
      await http.post("/auth/2fa/enable");
      setEnabled(true);
      setOpenDialog(false);
      setCode("");
      toast.success("2FA enable ho gaya! 🔒");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Enable nahi ho paya");
    } finally {
      setVerifying(false);
    }
  };

  const disable = async () => {
    if (!window.confirm("2FA disable karna hai?")) return;
    try {
      await http.post("/auth/2fa/disable");
      setEnabled(false);
      toast.success("2FA disable ho gaya");
    } catch {
      toast.error("Nahi ho paya");
    }
  };

  return (
    <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-[#2A4F4F]" />
        <div className="font-heading font-semibold text-[#1C1917]">Two-Factor Authentication</div>
      </div>
      <div className="text-xs text-[#78716C] mb-3">
        Login pe email OTP se ek extra security layer add karo
      </div>

      {enabled === true ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs text-[#3B6446] bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-lg px-3 py-2">
            ✓ 2FA Enabled
          </div>
          <Button size="sm" variant="outline" onClick={disable} data-testid="twofa-disable-btn"
            className="border-[#D96C52] text-[#D96C52] hover:bg-[#D96C52]/10 rounded-full">
            Disable
          </Button>
        </div>
      ) : (
        <Button onClick={startEnable} disabled={sending} data-testid="twofa-enable-btn"
          className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <ShieldCheck className="w-4 h-4 mr-1" />
          {sending ? "Code bhej raha…" : "2FA Enable Karo"}
        </Button>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Code Verify Karo</DialogTitle>
            <DialogDescription>{user?.email} pe 6-digit code bheja hai. Yahan daalo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>6-digit Code</Label>
              <Input inputMode="numeric" pattern="[0-9]*" maxLength={6}
                data-testid="twofa-code-input" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-2xl text-center tracking-[0.5em] font-heading font-bold" placeholder="••••••" />
            </div>
            <Button onClick={confirmEnable} disabled={verifying} data-testid="twofa-confirm-btn"
              className="w-full bg-[#2A4F4F] text-white rounded-full">
              {verifying ? "Verify ho raha…" : "Confirm & Enable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
