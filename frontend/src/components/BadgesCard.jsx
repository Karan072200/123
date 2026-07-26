import React, { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Award } from "lucide-react";

export default function BadgesCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    http.get("/analytics/badges")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div
      data-testid="badges-card"
      className="rounded-2xl p-5 bg-white border border-[#E7E5DF] soft-rise"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">
          Achievements
        </span>
        <div className="flex items-center gap-1 text-xs font-semibold text-[#2A4F4F]">
          <Award className="w-4 h-4" />
          {data.earned_count}/{data.total_count}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {data.badges.map((b) => (
          <div
            key={b.id}
            data-testid={`badge-${b.id}`}
            title={`${b.name} — ${b.desc}`}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-opacity ${
              b.earned ? "opacity-100" : "opacity-30 grayscale"
            }`}
          >
            <div
              className={`w-11 h-11 flex items-center justify-center rounded-full text-xl ${
                b.earned ? "bg-[#E8B365]/20" : "bg-[#F2F0EA]"
              }`}
            >
              {b.emoji}
            </div>
            <span className="text-[10px] leading-tight text-[#57534E]">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
