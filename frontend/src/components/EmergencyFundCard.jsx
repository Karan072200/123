import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_STYLES = {
  excellent: { bg: "from-[#4A7C59] to-[#3B6446]", text: "text-white", Icon: CheckCircle2 },
  good: { bg: "from-[#2A4F4F] to-[#1F3939]", text: "text-white", Icon: Shield },
  warning: { bg: "from-[#E8B365] to-[#D9944A]", text: "text-white", Icon: AlertTriangle },
  critical: { bg: "from-[#D96C52] to-[#B15039]", text: "text-white", Icon: AlertTriangle },
};

export default function EmergencyFundCard() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [data, setData] = useState(null);

  useEffect(() => {
    http.get("/analytics/emergency-fund").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return null;

  const style = STATUS_STYLES[data.status] || STATUS_STYLES.warning;
  const Icon = style.Icon;
  const progress = data.ideal_fund_amount > 0
    ? Math.min(100, Math.round((data.total_saved / data.ideal_fund_amount) * 100))
    : 0;

  return (
    <div
      data-testid="emergency-fund-card"
      className={`rounded-xl p-5 bg-gradient-to-br ${style.bg} ${style.text} soft-rise`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-widest uppercase opacity-90">
            Emergency Fund
          </span>
        </div>
        <span className="text-xs font-mono opacity-80">{progress}% / ideal</span>
      </div>

      <div className="font-heading text-3xl font-bold" data-testid="emergency-months-covered">
        {data.months_covered} <span className="text-lg font-medium opacity-80">mahine cover</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs opacity-90">
        <TrendingUp className="w-3 h-3" />
        <span>Ideal: {data.ideal_months} mahine ({formatMoney(data.ideal_fund_amount, cur)})</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-full bg-white/20 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-white/90 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs opacity-95 leading-relaxed">{data.message}</p>
    </div>
  );
}
