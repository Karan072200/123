import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Users, Sparkles, ArrowRight } from "lucide-react";

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="bg-white border border-[#E7E5DF] rounded-lg p-6 hover:-translate-y-1 transition-transform">
    <div className="w-11 h-11 rounded-lg bg-[#2A4F4F]/10 flex items-center justify-center mb-4">
      <Icon className="w-5 h-5 text-[#2A4F4F]" />
    </div>
    <h3 className="font-heading text-lg font-semibold text-[#1C1917] mb-1">{title}</h3>
    <p className="text-sm text-[#57534E] leading-relaxed">{desc}</p>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen paper-grain">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-[#1C1917]">Apka Munim</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" data-testid="nav-login-link">
            <Button variant="ghost" className="text-[#1C1917] hover:bg-[#F2F0EA]">Login</Button>
          </Link>
          <Link to="/register" data-testid="nav-register-link">
            <Button className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full px-5">
              Shuru karo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="soft-rise">
          <div className="inline-flex items-center gap-2 bg-[#E8B365]/15 border border-[#E8B365]/30 rounded-full px-3 py-1 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#B98330]" />
            <span className="text-xs font-semibold tracking-wide text-[#8B6220]">AI powered • Hinglish first</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1C1917] leading-tight">
            Aapka paisa,<br/>
            <span className="text-[#2A4F4F]">aapke haath</span> mein.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-lg">
            Kitne paise aaye, kitne gaye, kisse lene hain, kisko dene hain — sab ek jagah.
            Savings, Current, Cash — sabka hisaab Apka Munim mein.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" data-testid="hero-cta-register">
              <Button size="lg" className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full px-7 h-12 text-base">
                Free mein try karo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login" data-testid="hero-cta-login">
              <Button size="lg" variant="outline"
                className="rounded-full px-7 h-12 text-base border-[#2A4F4F]/30 text-[#2A4F4F] hover:bg-[#2A4F4F]/5">
                Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="soft-rise" style={{ animationDelay: "120ms" }}>
          <div className="bg-white border border-[#E7E5DF] rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-gradient-to-br from-[#2A4F4F] to-[#1F3B3B] rounded-xl p-5 text-white">
                <div className="text-xs uppercase tracking-widest opacity-70">Total Balance</div>
                <div className="font-heading text-4xl font-bold mt-1">₹1,24,750</div>
                <div className="text-xs opacity-80 mt-2">Across 3 accounts</div>
              </div>
              <div className="bg-[#4A7C59]/10 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wide text-[#3B6446] font-semibold">Aaya</div>
                <div className="font-heading text-2xl font-bold text-[#3B6446] mt-1">₹45,000</div>
              </div>
              <div className="bg-[#D96C52]/10 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wide text-[#B15039] font-semibold">Gaya</div>
                <div className="font-heading text-2xl font-bold text-[#B15039] mt-1">₹22,340</div>
              </div>
              <div className="bg-[#E8B365]/15 rounded-xl p-4 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#8B6220] font-semibold">Udhaar</div>
                    <div className="font-heading text-lg font-semibold text-[#1C1917] mt-1">
                      Lene: ₹3,200 · Dene: ₹1,500
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-[#8B6220]/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-5">
        <Feature icon={Wallet} title="Multiple Accounts"
          desc="Savings, Current, Cash, Wallet — jitne bhi ho, sab track karo alag-alag." />
        <Feature icon={TrendingUp} title="Charts & Reports"
          desc="Monthly income vs kharcha ka graph. Kis category mein zyada uda pata chalega." />
        <Feature icon={Users} title="Udhaar Tracker"
          desc="Paise lene hai kisse, dene hai kisko — sab yaad rahega. Reminders bhi." />
      </section>
    </div>
  );
}
