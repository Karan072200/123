import React, { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { TrendingUp, Award } from "lucide-react";

const GRADE_COLORS = {
  "A+": "#4A7C59", "A": "#4A7C59", "B": "#E8B365",
  "C": "#D96C52", "D": "#B15039",
};

export default function HealthScoreCard() {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    http.get("/analytics/health-score")
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const color = GRADE_COLORS[data.grade] || "#2A4F4F";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (data.score / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-[#E7E5DF] p-5"
      data-testid="health-score-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#A8A29E]">
          Financial Health Score
        </div>
        <Award className="w-4 h-4 text-[#A8A29E]" />
      </div>

      <div className="flex items-center gap-5">
        {/* Circular Progress */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#F2F0EA" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-heading text-3xl font-bold" style={{ color }}>{data.score}</div>
            <div className="text-xs text-[#78716C]">/ 100</div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading text-2xl font-bold" style={{ color }}>{data.grade}</span>
            <span className="text-sm font-semibold text-[#1C1917]">{data.motto}</span>
          </div>
          <p className="text-xs text-[#57534E] leading-snug">{data.message}</p>
          <button onClick={() => setExpanded(!expanded)}
            data-testid="health-score-expand-btn"
            className="text-xs text-[#2A4F4F] font-semibold mt-2 hover:underline">
            {expanded ? "Hide details" : "Details dekho →"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-[#E7E5DF] space-y-2">
          {Object.entries(data.breakdown).map(([key, val]) => {
            const maxes = { savings: 40, budget: 25, udhaar: 15, diversification: 10, activity: 10 };
            const max = maxes[key] || 20;
            const pct = (val / max) * 100;
            const labels = {
              savings: "Savings Rate", budget: "Budget Adherence", udhaar: "Udhaar Balance",
              diversification: "Multi Accounts", activity: "Tracking Activity",
            };
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#57534E] font-medium">{labels[key]}</span>
                  <span className="text-[#78716C]">{val} / {max}</span>
                </div>
                <div className="h-1.5 bg-[#F2F0EA] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
          <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#F9F8F6] p-2 rounded">
              <div className="text-[#78716C]">Savings Rate</div>
              <div className="font-bold text-[#1C1917]">{data.stats.savings_rate}%</div>
            </div>
            <div className="bg-[#F9F8F6] p-2 rounded">
              <div className="text-[#78716C]">Transactions</div>
              <div className="font-bold text-[#1C1917]">{data.stats.transaction_count}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
