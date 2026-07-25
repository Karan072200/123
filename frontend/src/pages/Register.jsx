import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/api";
import { Wallet } from "lucide-react";
import PasswordStrengthMeter, { checkPasswordStrength } from "@/components/PasswordStrengthMeter";
import { GoogleLogin } from "@react-oauth/google";

export default function Register() {
  const { register, error } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!checkPasswordStrength(password).isValid) {
      return; // meter shows requirements
    }
    setLoading(true);
    const ok = await register(name, email, password, currency);
    setLoading(false);
    if (ok) nav("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center paper-grain p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-2xl font-bold text-[#1C1917]">Apka Munim</span>
        </Link>

        <div className="bg-white border border-[#E7E5DF] rounded-2xl p-8 shadow-sm soft-rise">
          <h1 className="font-heading text-2xl font-bold text-[#1C1917]">Account banao</h1>
          <p className="text-sm text-[#57534E] mt-1">Free hai. Kuch bhi charge nahi.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Naam</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)}
                data-testid="register-name-input"
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email-input"
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Password</Label>
              <Input type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password-input"
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
              <PasswordStrengthMeter password={password} />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5 border-[#E7E5DF]" data-testid="register-currency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} data-testid={`currency-option-${c.code}`}>
                      {c.symbol} {c.label} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div data-testid="register-error" className="text-sm text-[#B15039] bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !checkPasswordStrength(password).isValid}
              data-testid="register-submit-button"
              className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
              {loading ? "Ban raha hai…" : "Account banao"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-[#E7E5DF] flex-1" />
            <span className="text-xs text-[#78716C]">YA</span>
            <div className="h-px bg-[#E7E5DF] flex-1" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/google`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ credential: credentialResponse.credential }),
                });
                if (res.ok) {
                  window.location.href = "/dashboard";
                }
              }}
              onError={() => console.log("Google login failed")}
            />
          </div>

          <p className="text-sm text-[#57534E] mt-6 text-center">
            Already registered? <Link to="/login" data-testid="register-to-login-link"
              className="text-[#2A4F4F] font-semibold hover:underline">Login karo</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
