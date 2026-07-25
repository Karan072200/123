import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { http, API, ensureNotificationPermission } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Bell, Trash2, AlertTriangle, FileText, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";

function PinSection() {
  const [pinStatus, setPinStatus] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const loadStatus = async () => {
    try {
      const { data } = await http.get("/auth/pin/status");
      setPinStatus(data.enabled);
    } catch { /* ignore */ }
  };
  React.useEffect(() => { loadStatus(); }, []);

  const save = async () => {
    if (pin !== confirmPin) return toast.error("PIN match nahi ho raha");
    if (pin.length < 4) return toast.error("PIN minimum 4 digits");
    setSaving(true);
    try {
      await http.post("/auth/pin/set", { pin, password });
      toast.success("PIN set ho gaya! 🔒");
      setOpenDialog(false);
      setPin(""); setConfirmPin(""); setPassword("");
      loadStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "PIN set nahi ho paya");
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!window.confirm("PIN remove karna hai?")) return;
    try {
      await http.delete("/auth/pin");
      toast.success("PIN remove ho gaya");
      loadStatus();
    } catch { toast.error("Nahi ho paya"); }
  };

  return (
    <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4 text-[#2A4F4F]" />
        <div className="font-heading font-semibold text-[#1C1917]">PIN Login</div>
      </div>
      <div className="text-xs text-[#78716C] mb-3">4-6 digit PIN se fast login karo</div>
      {pinStatus === null ? (
        <div className="text-xs text-[#78716C]">Loading…</div>
      ) : pinStatus ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs text-[#3B6446] bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-lg px-3 py-2">
            ✓ PIN Enabled
          </div>
          <Button size="sm" variant="outline" onClick={remove} data-testid="pin-remove-btn"
            className="border-[#D96C52] text-[#D96C52] hover:bg-[#D96C52]/10 rounded-full">
            Remove
          </Button>
        </div>
      ) : (
        <Button onClick={() => setOpenDialog(true)} data-testid="pin-setup-btn"
          className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
          <KeyRound className="w-4 h-4 mr-1" /> PIN Set Karo
        </Button>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIN Set Karo</DialogTitle>
            <DialogDescription>4-6 digit numeric PIN chuno. Password se authorize karo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Naya PIN</Label>
              <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                data-testid="pin-new-input" value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-2xl text-center tracking-[0.5em] font-heading font-bold" placeholder="••••" />
            </div>
            <div>
              <Label>PIN Confirm</Label>
              <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                data-testid="pin-confirm-input" value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                className="text-2xl text-center tracking-[0.5em] font-heading font-bold" placeholder="••••" />
            </div>
            <div>
              <Label>Current Password (authorize)</Label>
              <Input type="password" data-testid="pin-password-input" value={password}
                onChange={e => setPassword(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving} data-testid="pin-save-btn"
              className="w-full bg-[#2A4F4F] text-white rounded-full">
              {saving ? "Save ho raha…" : "PIN Save Karo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [notifStatus, setNotifStatus] = useState(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await http.get("/auth/me/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apka-munim-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data export ho gaya!");
    } catch (e) {
      toast.error("Export nahi ho paya");
    } finally {
      setExporting(false);
    }
  };

  const askNotifs = async () => {
    const ok = await ensureNotificationPermission();
    setNotifStatus(Notification.permission);
    toast(ok ? "Notifications on ho gaye!" : "Notifications block hain — browser settings check karo");
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await http.delete("/auth/me");
      toast.success("Account delete ho gaya");
      await logout();
      nav("/");
    } catch (e) {
      toast.error("Delete nahi ho paya");
    } finally {
      setDeleting(false);
    }
  };

  const Section = ({ icon: Icon, title, desc, children }) => (
    <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#2A4F4F]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#2A4F4F]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-[#1C1917]">{title}</h3>
          <p className="text-xs text-[#78716C] mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Settings</h1>
        <p className="text-sm text-[#57534E] mt-1">Account, privacy aur data control.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-[#A8A29E] font-semibold">Signed in as</div>
          <div className="font-heading text-lg font-semibold text-[#1C1917] mt-1">{user?.name}</div>
          <div className="text-sm text-[#78716C]">{user?.email}</div>
          <div className="text-xs text-[#78716C] mt-2">Currency: {user?.currency}</div>
        </div>

        <Section icon={Bell} title="Notifications" desc="Budget cross ho toh alert milega.">
          <div className="text-xs text-[#57534E] mb-2">
            Status: <b className="capitalize">{notifStatus}</b>
          </div>
          {notifStatus !== "granted" && notifStatus !== "unsupported" && (
            <Button onClick={askNotifs}
              data-testid="settings-notif-enable-btn"
              className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
              <Bell className="w-4 h-4 mr-1" /> Enable karo
            </Button>
          )}
          {notifStatus === "granted" && (
            <div className="text-xs text-[#3B6446] bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-lg px-3 py-2">
              ✓ Notifications enabled
            </div>
          )}
          {notifStatus === "unsupported" && (
            <div className="text-xs text-[#78716C]">Aapke browser mein support nahi hai.</div>
          )}
        </Section>

        <PinSection />

        <Section icon={Download} title="Data Export" desc="Aapka pura data JSON mein download karo.">
          <Button onClick={exportAll} disabled={exporting}
            data-testid="settings-export-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            <Download className="w-4 h-4 mr-1" />
            {exporting ? "Export ho raha…" : "Download all data (JSON)"}
          </Button>
        </Section>

        <Section icon={Shield} title="Legal" desc="Privacy Policy aur Terms of Service.">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/privacy" data-testid="settings-privacy-link">
              <Button variant="outline" className="w-full border-[#E7E5DF] rounded-full">
                <Shield className="w-3.5 h-3.5 mr-1" /> Privacy
              </Button>
            </Link>
            <Link to="/terms" data-testid="settings-terms-link">
              <Button variant="outline" className="w-full border-[#E7E5DF] rounded-full">
                <FileText className="w-3.5 h-3.5 mr-1" /> Terms
              </Button>
            </Link>
          </div>
        </Section>
      </div>

      <div className="bg-[#D96C52]/5 border border-[#D96C52]/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D96C52]/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#B15039]" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-[#B15039]">Danger Zone</h3>
            <p className="text-xs text-[#57534E] mt-1 mb-3">
              Account delete karne se aapka saara data permanently hat jayega — accounts, transactions, udhaar,
              budgets, recurring rules, personal ledger. Ye undo nahi ho sakta.
            </p>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}
              data-testid="settings-delete-account-btn"
              className="border-[#D96C52] text-[#B15039] hover:bg-[#D96C52]/10 rounded-full">
              <Trash2 className="w-4 h-4 mr-1" /> Delete my account
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#B15039]">Account permanently delete karo?</DialogTitle>
            <DialogDescription>
              Ye action <b>undo nahi</b> ho sakta. Confirm karne ke liye niche <b>DELETE</b> type karo.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
              Type DELETE to confirm
            </Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              data-testid="settings-delete-confirm-input"
              className="mt-1.5 font-mono" placeholder="DELETE" />
          </div>
          <Button onClick={deleteAccount} disabled={confirmText !== "DELETE" || deleting}
            data-testid="settings-delete-confirm-btn"
            className="w-full bg-[#B15039] hover:bg-[#8B3F2D] text-white rounded-full h-11">
            {deleting ? "Delete ho raha…" : "Permanently delete karo"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
