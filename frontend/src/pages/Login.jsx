import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Lock, KeyRound } from "lucide-react";
import { http, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const { login, refresh, error } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("password"); // "password" | "pin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setLoading(true);
    if (mode === "password") {
      const ok = await login(email, password);
      setLoading(false);
      if (ok) nav("/dashboard");
    } else {
      // PIN login
      try {
        await http.post("/auth/pin/verify", { email: email.trim().toLowerCase(), pin });
        await refresh();
        nav("/dashboard");
      } catch (e) {
        setLocalError(formatApiError(e?.response?.data?.detail));
        toast.error(formatApiError(e?.response?.data?.detail));
      }
      setLoading(false);
    }
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
          <h1 className="font-heading text-2xl font-bold text-[#1C1917]">Wapas swagat hai</h1>
          <p className="text-sm text-[#57534E] mt-1">Apne Apka Munim mein login karo.</p>

          {/* Mode Tabs */}
          <div className="mt-5 flex bg-[#F2F0EA] rounded-full p-1">
            <button type="button" onClick={() => setMode("password")}
              data-testid="login-mode-password"
              className={`flex-1 h-9 rounded-full text-xs font-semibold transition flex items-center justify-center gap-1.5
                ${mode === "password" ? "bg-[#2A4F4F] text-white shadow" : "text-[#57534E]"}`}>
              <Lock className="w-3.5 h-3.5" /> Password
            </button>
            <button type="button" onClick={() => setMode("pin")}
              data-testid="login-mode-pin"
              className={`flex-1 h-9 rounded-full text-xs font-semibold transition flex items-center justify-center gap-1.5
                ${mode === "pin" ? "bg-[#2A4F4F] text-white shadow" : "text-[#57534E]"}`}>
              <KeyRound className="w-3.5 h-3.5" /> PIN
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
                Email
              </Label>
              <Input id="email" type="email" required value={email}
                data-testid="login-email-input"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
            </div>

            {mode === "password" ? (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
                    Password
                  </Label>
                  <Link to="/forgot-password" data-testid="forgot-password-link"
                    className="text-xs text-[#2A4F4F] hover:underline font-semibold">
                    Bhool gaye?
                  </Link>
                </div>
                <Input id="password" type="password" required value={password}
                  data-testid="login-password-input"
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
              </div>
            ) : (
              <div>
                <Label htmlFor="pin" className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
                  PIN (4-6 digits)
                </Label>
                <Input id="pin" type="password" inputMode="numeric" pattern="[0-9]*"
                  required minLength={4} maxLength={6} value={pin}
                  data-testid="login-pin-input"
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F] text-2xl text-center tracking-[0.5em] font-heading font-bold"
                  placeholder="••••" />
                <p className="text-[11px] text-[#78716C] mt-1.5">
                  Pehli baar? Password se login karo, phir Settings me PIN set karo.
                </p>
              </div>
            )}

            {(error || localError) && (
              <div data-testid="login-error" className="text-sm text-[#B15039] bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-md px-3 py-2">
                {error || localError}
              </div>
            )}

            <Button type="submit" disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
              {loading ? "Login ho raha hai…" : mode === "password" ? "Login" : "PIN se Login"}
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
            Naye ho? <Link to="/register" data-testid="login-to-register-link"
              className="text-[#2A4F4F] font-semibold hover:underline">Account banao</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
