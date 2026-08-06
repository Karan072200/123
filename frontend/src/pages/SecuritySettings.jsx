import React, { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Smartphone, Key, LogOut, Clock, CheckCircle2, ScrollText } from "lucide-react";

/**
 * Security & Sessions page — Phase 3.
 *
 * Sections:
 *   1. Two-Factor Authentication (TOTP)
 *      - Setup → shows QR code + secret → user scans in Google Authenticator/Authy
 *      - Verify → enters 6-digit code → activates + shows 8 backup codes
 *      - Disable → verify last code → deactivates
 *   2. Active Sessions — list refresh tokens (with rotate + logout-all)
 *   3. Recent Login Activity — last 20 login events
 *   4. Audit Trail — recent actions on your account (invoice edits, party changes, etc.)
 */
export default function SecuritySettings() {
  const [status, setStatus] = useState({ totp_enabled: false, email_2fa_enabled: false, backup_codes_remaining: 0 });
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [audit, setAudit] = useState([]);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, ss, al] = await Promise.all([
        http.get("/auth/2fa/status"),
        http.get("/security/sessions"),
        http.get("/audit-logs", { params: { limit: 30 } }),
      ]);
      setStatus(s.data);
      setSessions(ss.data.sessions || []);
      setActivity(ss.data.recent_activity || []);
      setAudit(al.data.items || []);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startSetup = async () => {
    try {
      const { data } = await http.post("/auth/2fa/totp/setup");
      setSetup(data);
      setBackupCodes(null);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { toast.error("Enter 6-digit code"); return; }
    try {
      const { data } = await http.post("/auth/2fa/totp/verify", { code });
      toast.success("2FA enabled");
      setBackupCodes(data.backup_codes || []);
      setCode("");
      setSetup(null);
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const disable = async () => {
    const c = window.prompt("Enter your current 6-digit code to confirm disable:");
    if (!c) return;
    try {
      await http.post("/auth/2fa/totp/disable", { code: c });
      toast.success("2FA disabled");
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const logoutAll = async () => {
    if (!window.confirm("Log out of every device? You'll need to sign in again everywhere.")) return;
    try {
      const { data } = await http.post("/auth/logout-all");
      toast.success(`${data.revoked} session(s) revoked`);
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const issueRefresh = async () => {
    try {
      const { data } = await http.post("/auth/refresh/issue");
      toast.success("Refresh session issued");
      // stash into localStorage under a namespaced key
      localStorage.setItem("apka-refresh", data.refresh_token);
      load();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#151312]" data-testid="security-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C1917] font-heading">Security &amp; Sessions</h1>
          </div>
          <p className="text-sm text-[#57534E]">Two-factor authentication, active devices, and audit trail</p>
        </div>

        {/* 2FA */}
        <Card className="p-5 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid="2fa-card">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-5 h-5 text-[#2A4F4F]" />
            <h2 className="text-lg font-semibold text-[#1C1917]">Two-Factor Authentication (TOTP)</h2>
            {status.totp_enabled && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-semibold">ENABLED</span>}
          </div>

          {!status.totp_enabled && !setup && (
            <div>
              <p className="text-sm text-[#57534E] mb-3">Scan a QR code in Google Authenticator, Authy, or 1Password to protect your account with a rotating 6-digit code.</p>
              <Button onClick={startSetup} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="2fa-setup-btn">
                <Key className="w-4 h-4 mr-1" /> Enable 2FA
              </Button>
            </div>
          )}

          {setup && (
            <div className="space-y-3">
              <p className="text-sm text-[#57534E]">Scan this QR in your authenticator app, then enter the 6-digit code to activate.</p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={`data:image/png;base64,${setup.qr_code_png_base64}`}
                  alt="TOTP QR"
                  className="w-40 h-40 rounded border border-[#E7E5DF] bg-white p-2"
                  data-testid="2fa-qr"
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs text-[#57534E]">Or enter secret manually</Label>
                    <div className="font-mono text-xs bg-[#F2F0EA] dark:bg-[#262220] p-2 rounded break-all">{setup.secret}</div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-[#57534E]">6-digit code</Label>
                      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" maxLength={6} data-testid="2fa-code-input" />
                    </div>
                    <Button onClick={verify} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="2fa-verify-btn">Verify &amp; Enable</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {backupCodes && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded" data-testid="2fa-backup-codes">
              <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Save these backup codes</div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">Each code works once if you lose your authenticator. Store them safely — they won&apos;t be shown again.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-sm">
                {backupCodes.map((c) => (<div key={c} className="bg-white dark:bg-[#1E1B1A] px-2 py-1 rounded border border-[#E7E5DF]">{c}</div>))}
              </div>
            </div>
          )}

          {status.totp_enabled && (
            <div className="mt-2 space-y-2">
              <div className="text-sm text-[#57534E]">Backup codes remaining: <span className="font-semibold text-[#1C1917]">{status.backup_codes_remaining}</span></div>
              <Button onClick={disable} variant="outline" className="text-rose-600 border-rose-300" data-testid="2fa-disable-btn">Disable 2FA</Button>
            </div>
          )}
        </Card>

        {/* Sessions */}
        <Card className="p-5 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid="sessions-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-[#2A4F4F]" />
              <h2 className="text-lg font-semibold text-[#1C1917]">Active Sessions</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={issueRefresh} variant="outline" size="sm">New Refresh Session</Button>
              <Button onClick={logoutAll} variant="outline" size="sm" className="text-rose-600 border-rose-300" data-testid="logout-all-btn">Log out everywhere</Button>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="text-sm text-[#78716C]">No active refresh sessions. The main cookie is still valid.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm border border-[#E7E5DF] rounded p-2">
                  <div className="font-mono text-xs text-[#57534E]">{s.id}</div>
                  <div className="text-[#78716C]">created {new Date(s.created_at).toLocaleString()} · expires {(s.expires_at || "").slice(0, 10)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Login activity */}
        <Card className="p-5 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-[#2A4F4F]" />
            <h2 className="text-lg font-semibold text-[#1C1917]">Recent Login Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="text-sm text-[#78716C]">No activity recorded yet.</div>
          ) : (
            <div className="space-y-1 text-sm">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#E7E5DF] last:border-b-0 py-1.5">
                  <div className="text-[#57534E]">{a.method || "login"} · {a.ip || "-"} · {a.user_agent?.slice(0, 40) || "-"}</div>
                  <div className="text-xs text-[#78716C]">{a.at?.slice(0, 19).replace("T", " ")}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Audit trail */}
        <Card className="p-5 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid="audit-card">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-5 h-5 text-[#2A4F4F]" />
            <h2 className="text-lg font-semibold text-[#1C1917]">Audit Trail (last 30)</h2>
          </div>
          {audit.length === 0 ? (
            <div className="text-sm text-[#78716C]">No changes logged yet. Every warehouse/security action from now on is recorded here.</div>
          ) : (
            <div className="space-y-1 text-sm">
              {audit.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-[#E7E5DF] last:border-b-0 py-1.5">
                  <div>
                    <span className="font-semibold text-[#1C1917]">{a.action}</span>
                    <span className="text-[#57534E]"> · {a.entity_type}</span>
                    {a.entity_id && <span className="text-xs font-mono text-[#78716C] ml-1">{a.entity_id.slice(0, 12)}…</span>}
                  </div>
                  <div className="text-xs text-[#78716C]">{a.at?.slice(0, 19).replace("T", " ")}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
