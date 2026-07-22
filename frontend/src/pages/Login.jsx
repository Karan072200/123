import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";

export default function Login() {
  const { login, error } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
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
          <span className="font-heading text-2xl font-bold text-[#1C1917]">PaisaBook</span>
        </Link>

        <div className="bg-white border border-[#E7E5DF] rounded-2xl p-8 shadow-sm soft-rise">
          <h1 className="font-heading text-2xl font-bold text-[#1C1917]">Wapas swagat hai</h1>
          <p className="text-sm text-[#57534E] mt-1">Apne PaisaBook mein login karo.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
                Email
              </Label>
              <Input id="email" type="email" required value={email}
                data-testid="login-email-input"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
                Password
              </Label>
              <Input id="password" type="password" required value={password}
                data-testid="login-password-input"
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 border-[#E7E5DF] focus-visible:ring-[#2A4F4F]" />
            </div>

            {error && (
              <div data-testid="login-error" className="text-sm text-[#B15039] bg-[#D96C52]/10 border border-[#D96C52]/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
              {loading ? "Login ho raha hai…" : "Login"}
            </Button>
          </form>

          <p className="text-sm text-[#57534E] mt-6 text-center">
            Naye ho? <Link to="/register" data-testid="login-to-register-link"
              className="text-[#2A4F4F] font-semibold hover:underline">Account banao</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
