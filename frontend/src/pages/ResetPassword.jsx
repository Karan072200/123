import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PasswordStrengthMeter, { checkPasswordStrength } from "@/components/PasswordStrengthMeter";
import { Wallet } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strong = checkPasswordStrength(pwd).isValid;
  const matches = pwd && pwd === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!strong) return toast.error("Password strong hona chahiye");
    if (!matches) return toast.error("Passwords match nahi ho rahe");
    if (!token) return toast.error("Invalid reset link");
    setLoading(true);
    try {
      await http.post("/auth/reset-password", { token, new_password: pwd });
      setDone(true);
      toast.success("Password reset ho gaya! Ab login karo.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#E8B365]" />
          </div>
          <span className="font-heading font-bold text-xl text-[#1C1917]">Apka Munim</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5DF]">
          {done ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="font-heading text-xl font-bold text-[#1C1917] mb-2">Password Reset Ho Gaya!</h2>
              <p className="text-sm text-[#57534E]">Login page pe redirect kar rahe hain...</p>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-[#1C1917] mb-2">Naya Password Set Karo</h2>
              <p className="text-sm text-[#78716C] mb-5">Strong password chuno — future me yaad rakhna easy ho.</p>
              <form onSubmit={submit} className="space-y-4" data-testid="reset-password-form">
                <div>
                  <Label>Naya Password</Label>
                  <Input type="password" autoFocus placeholder="Strong password"
                    data-testid="reset-password-input"
                    value={pwd} onChange={e => setPwd(e.target.value)} />
                  <PasswordStrengthMeter password={pwd} />
                </div>
                <div>
                  <Label>Password Confirm Karo</Label>
                  <Input type="password" placeholder="Wapas type karo"
                    data-testid="reset-confirm-input"
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                  {confirm && !matches && (
                    <p className="text-xs text-[#D96C52] mt-1">❌ Passwords match nahi ho rahe</p>
                  )}
                  {confirm && matches && (
                    <p className="text-xs text-[#4A7C59] mt-1">✅ Match ho gaya</p>
                  )}
                </div>
                <Button type="submit" disabled={loading || !strong || !matches}
                  data-testid="reset-submit-btn"
                  className="w-full bg-[#2A4F4F] hover:bg-[#1a3838] text-white rounded-full h-11">
                  {loading ? "Reset ho raha..." : "Password Reset Karo"}
                </Button>
                <div className="text-center text-sm">
                  <Link to="/login" className="text-[#2A4F4F] font-semibold hover:underline">← Login page pe wapas</Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
