import React, { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function VibeCard() {
  const [vibe, setVibe] = useState(null);

  const refresh = () => {
    http.get("/analytics/vibe-check")
      .then(r => setVibe(r.data))
      .catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  if (!vibe) return null;

  return (
    <button onClick={refresh} data-testid="vibe-card"
      className="w-full text-left bg-gradient-to-r from-[#E8B365]/15 to-[#4A7C59]/10 rounded-2xl p-4
                 border border-[#E8B365]/30 hover:border-[#E8B365]/60 transition-all group">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{vibe.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#8B6220] mb-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Munim Ji ki Vibe
          </div>
          <p className="text-sm font-medium text-[#1C1917] leading-snug">{vibe.text}</p>
        </div>
        <div className="text-xs text-[#78716C] opacity-0 group-hover:opacity-100 transition-opacity">
          Refresh →
        </div>
      </div>
    </button>
  );
}
