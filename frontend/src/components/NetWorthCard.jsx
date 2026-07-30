import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Landmark, TrendingUp, TrendingDown } from "lucide-react";

export default function NetWorthCard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const cur = user?.currency || "INR";

  useEffect(() => {
    http.get("/analytics/net-worth")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const isPositive = data.net_worth >= 0;

  return (
    <div
      data-testid="net-worth-card"
      className="rounded-2xl p-5 bg-[#2A4F4F] text-white soft-rise"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-80">
          Net Worth
        </span>
        <Landmark className="w-4 h-4 opacity-80" />
      </div>
      <div className="font-heading text-2xl md:text-3xl font-bold" data-testid="net-worth-amount">
        {formatMoney(data.net_worth, cur)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/10 rounded-lg p-2.5">
          <div className="flex items-center gap-1 opacity-80 mb-1">
            <TrendingUp className="w-3 h-3" /> Assets
          </div>
          <div className="font-semibold">{formatMoney(data.total_assets, cur)}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2.5">
          <div className="flex items-center gap-1 opacity-80 mb-1">
            <TrendingDown className="w-3 h-3" /> Liabilities
          </div>
          <div className="font-semibold">{formatMoney(data.total_liabilities, cur)}</div>
        </div>
      </div>
      {data.total_investments > 0 && (
        <div className="mt-2 text-xs opacity-70">
          Investments included: {formatMoney(data.total_investments, cur)}
        </div>
      )}
    </div>
  );
}
