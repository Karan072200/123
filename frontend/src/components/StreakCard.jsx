import React, { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Flame } from "lucide-react";

export default function StreakCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    http.get("/analytics/streak")
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const isActive = data.current_streak > 0;
  return (
    <div className={`rounded-2xl p-5 ${isActive
      ? "bg-gradient-to-br from-[#D96C52] to-[#B15039] text-white"
      : "bg-[#F2F0EA] text-[#1C1917] border border-[#E7E5DF]"}`}
      data-testid="streak-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold tracking-widest uppercase opacity-80">
          Streak
        </div>
        <Flame className={`w-4 h-4 ${isActive ? "text-[#E8B365]" : "opacity-60"}`} />
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="font-heading text-4xl font-bold">{data.current_streak}</span>
        <span className="text-sm opacity-80">din</span>
      </div>
      <p className="text-xs leading-snug opacity-90">{data.message}</p>
      {data.longest_streak > data.current_streak && (
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
          <span className="opacity-70">Longest ever</span>
          <span className="font-bold">🏆 {data.longest_streak} din</span>
        </div>
      )}
    </div>
  );
}
