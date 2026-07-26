import React, { useState } from "react";
import { Link } from "react-router-dom";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import useSEO from "@/hooks/useSEO";

export default function ForgotPassword() {
  useSEO({
    title: "Forgot Password | Apka Munim",
    description: "Apna Apka Munim password reset karo.",
    path: "/forgot-password",
    noindex: true,
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(""); // dev mode helper

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await http.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
      if (data.dev_link) setDevLink(data.dev_link);
      toast.success("Reset link bhej diya!");
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
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">📧</div>
              <h2 className="font-heading text-xl font-bold text-[#1C1917] mb-2">Email Bhej Diya!</h2>
              <p className="text-sm text-[#57534E] mb-4">
                <span className="font-semibold">{email}</span> pe reset link bheja hai.<br />
                Inbox check karo (spam folder bhi dekh lena).
              </p>
              {devLink && (
                <div className="bg-[#E8B365]/15 border border-[#E8B365]/30 rounded-lg p-3 text-xs text-left mb-4">
                  <div className="font-semibold text-[#8B6220] mb-1">🔧 Dev Mode Link:</div>
                  <a href={devLink} className="text-[#2A4F4F] break-all hover:underline">{devLink}</a>
                </div>
              )}
              <Link to="/login" className="text-sm text-[#2A4F4F] font-semibold hover:underline">
                ← Login page pe wapas
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-[#1C1917] mb-2">Password Bhool Gaye?</h2>
              <p className="text-sm text-[#78716C] mb-5">
                Koi baat nahi! Apna email daalo, hum reset link bhej denge.
              </p>
              <form onSubmit={submit} className="space-y-4" data-testid="forgot-password-form">
                <div>
                  <Label>Registered Email</Label>
                  <Input type="email" autoFocus placeholder="aapka@email.com"
                    data-testid="forgot-email-input"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading || !email.trim()}
                  data-testid="forgot-submit-btn"
                  className="w-full bg-[#2A4F4F] hover:bg-[#1a3838] text-white rounded-full h-11">
                  {loading ? "Bhej rahe..." : "Reset Link Bhejo"}
                </Button>
                <div className="text-center text-sm">
                  <Link to="/login" className="text-[#2A4F4F] font-semibold hover:underline">
                    ← Login page pe wapas
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
