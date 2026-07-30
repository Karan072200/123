import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Webhook, ArrowLeft, Copy, RefreshCw, ShieldCheck, ExternalLink, Eye, EyeOff, AlertTriangle } from "lucide-react";

/**
 * Settings → Webhook Setup
 * Show the user's public UPI webhook URL, let them rotate an HMAC secret,
 * and copy sample curl commands for PhonePe / Razorpay / Cashfree.
 */
export default function WebhookSetup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [info, setInfo] = useState({ webhook_url: "", has_secret: false });
  const [freshSecret, setFreshSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const backend = process.env.REACT_APP_BACKEND_URL || "";
  const genericUrl = backend + (info.webhook_url || "");
  const razorpayUrl = genericUrl ? genericUrl.replace(/\/?$/, "/razorpay") : "";
  const cashfreeUrl = genericUrl ? genericUrl.replace(/\/?$/, "/cashfree") : "";
  const phonepeUrl  = genericUrl ? genericUrl.replace(/\/?$/, "/phonepe")  : "";

  const load = async () => {
    try {
      const { data } = await http.get("/billing/webhook/info");
      setInfo(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const rotate = async () => {
    if (!window.confirm("Rotate secret? Any provider using the old secret will start getting 401 errors until you update them.")) return;
    setBusy(true);
    try {
      const { data } = await http.post("/billing/webhook/rotate");
      setFreshSecret(data.secret);
      setShowSecret(true);
      setInfo({ ...info, has_secret: true });
      toast.success("New secret generated. Copy it now — it's shown ONCE.");
    } catch { toast.error("Rotate failed"); }
    finally { setBusy(false); }
  };

  const copy = (label, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const sampleCurl = (url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-Signature-256: sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')" \\
  -d '$BODY'
# where BODY = {"amount": 9999, "reference": "INV/2526/0001", "payer_name": "Rahul Gupta", "payment_mode": "upi"}
# and  SECRET = the value you rotated below`;

  const Row = ({ label, value, badge }) => (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <div className="text-[10px] uppercase font-bold tracking-wider text-[#78716C] w-28">{label}</div>
      <code className="text-xs bg-[#F9F8F6] px-2 py-1 rounded border border-[#E7E5DF] flex-1 break-all font-mono">{value || "—"}</code>
      {badge}
      <button onClick={() => copy(label, value)} disabled={!value}
        className="px-2 py-1 text-xs rounded-md border border-[#E7E5DF] hover:bg-[#F2F0EA] disabled:opacity-40 flex items-center gap-1">
        <Copy className="w-3 h-3" /> {copied === label ? "Copied!" : "Copy"}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="webhook-setup-page">
      <div>
        <button onClick={() => nav("/settings")} className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3 h-3" /> Back to Settings
        </button>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#1C1917] flex items-center gap-2">
          <Webhook className="w-6 h-6 text-[#2A4F4F]" /> Payment Webhook Setup
        </h1>
        <p className="text-sm text-[#78716C] mt-1">
          Configure your payment provider so incoming UPI/bank payments auto-post here and match to open invoices — no typing.
        </p>
      </div>

      {/* URLs card */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold">Your Webhook Endpoints</h3>
            <p className="text-xs text-[#78716C]">Paste the matching URL into your payment provider's webhook settings.</p>
          </div>
          <a href="/billing/bank-payments" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            View incoming payments <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <Row label="Generic" value={genericUrl}
          badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">JSON in our schema</span>} />
        <Row label="Razorpay" value={razorpayUrl}
          badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">payment.captured</span>} />
        <Row label="Cashfree" value={cashfreeUrl}
          badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">PAYMENT_SUCCESS</span>} />
        <Row label="PhonePe" value={phonepeUrl}
          badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Merchant Callback</span>} />
      </div>

      {/* Secret card */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> HMAC Secret
            </h3>
            <p className="text-xs text-[#78716C]">
              Verifies every incoming webhook. Rotate anytime. {info.has_secret ? (
                <span className="text-emerald-700 font-semibold">✓ Secret configured</span>
              ) : (
                <span className="text-[#B15039] font-semibold">⚠ No secret set — webhooks accept unsigned requests (dev only).</span>
              )}
            </p>
          </div>
          <Button onClick={rotate} disabled={busy} data-testid="rotate-secret-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
            <RefreshCw className={`w-4 h-4 mr-1 ${busy ? "animate-spin" : ""}`} />
            {info.has_secret ? "Rotate Secret" : "Generate Secret"}
          </Button>
        </div>

        {freshSecret && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong>Save this now.</strong> This secret is shown only once — after leaving this page you can only see whether one exists, not the value.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly type={showSecret ? "text" : "password"} value={freshSecret}
                data-testid="fresh-secret-input"
                className="font-mono text-xs" />
              <button onClick={() => setShowSecret(!showSecret)}
                className="p-2 rounded-md border border-[#E7E5DF] hover:bg-[#F2F0EA]">
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => copy("secret", freshSecret)}
                className="px-2 py-1.5 text-xs rounded-md border border-[#E7E5DF] hover:bg-[#F2F0EA] flex items-center gap-1">
                <Copy className="w-3 h-3" /> {copied === "secret" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sample cURL */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Test with cURL</h3>
          <button onClick={() => copy("curl", sampleCurl(genericUrl))}
            className="px-2 py-1 text-xs rounded-md border border-[#E7E5DF] hover:bg-[#F2F0EA] flex items-center gap-1">
            <Copy className="w-3 h-3" /> {copied === "curl" ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-[#1C1917] text-emerald-300 rounded-lg p-3 text-[11px] overflow-x-auto font-mono leading-relaxed">
{sampleCurl(genericUrl)}
        </pre>
        <p className="text-[11px] text-[#78716C]">
          For provider webhooks (Razorpay etc.) their infrastructure signs the body — put the secret value from above into your provider's webhook settings.
        </p>
      </div>
    </div>
  );
}
