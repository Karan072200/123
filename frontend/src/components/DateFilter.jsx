import React, { useState } from "react";
import { Calendar, X } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Aaj" },
  { key: "yesterday", label: "Kal" },
  { key: "week", label: "Iss Hafta" },
  { key: "month", label: "Iss Maheena" },
  { key: "year", label: "Iss Saal" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

export function computeRange(preset, custom) {
  const now = new Date();
  const start = new Date(now); const end = new Date(now);
  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "yesterday":
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); break;
    case "week":
      start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999); break;
    case "month":
      start.setDate(1); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999); break;
    case "year":
      start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999); break;
    case "custom":
      if (custom?.from && custom?.to) {
        const f = new Date(custom.from); f.setHours(0, 0, 0, 0);
        const t = new Date(custom.to); t.setHours(23, 59, 59, 999);
        return { from: f.toISOString(), to: t.toISOString() };
      }
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function DateFilter({ value, onChange, className = "" }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const apply = () => {
    if (!from || !to) return;
    onChange("custom", { from, to });
    setCustomOpen(false);
  };

  const clear = () => {
    setFrom(""); setTo("");
    onChange("all");
    setCustomOpen(false);
  };

  return (
    <div className={`relative flex items-center gap-1.5 flex-wrap ${className}`} data-testid="date-filter">
      <Calendar className="w-4 h-4 text-[#78716C] hidden md:inline" />
      {PRESETS.map((p) => (
        <button
          key={p.key}
          data-testid={`date-preset-${p.key}`}
          onClick={() => {
            if (p.key === "custom") setCustomOpen((v) => !v);
            else onChange(p.key);
          }}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            value === p.key
              ? "bg-[#2A4F4F] text-white"
              : "bg-[#F2F0EA] text-[#57534E] hover:bg-[#E7E5DF]"
          }`}
        >
          {p.label}
        </button>
      ))}

      {customOpen && (
        <div className="absolute top-10 left-0 z-30 bg-white border border-[#E7E5DF] rounded-xl shadow-lg p-4 w-72"
          data-testid="custom-date-panel">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Custom Range</span>
            <button onClick={() => setCustomOpen(false)} className="p-1 hover:bg-[#F2F0EA] rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[#78716C]">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                data-testid="custom-date-from"
                className="w-full h-9 px-2 border border-[#E7E5DF] rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#78716C]">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                data-testid="custom-date-to"
                className="w-full h-9 px-2 border border-[#E7E5DF] rounded text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={clear} className="flex-1 h-8 text-xs rounded bg-[#F2F0EA] hover:bg-[#E7E5DF]">
                Clear
              </button>
              <button onClick={apply} disabled={!from || !to}
                data-testid="custom-date-apply"
                className="flex-1 h-8 text-xs rounded bg-[#2A4F4F] text-white hover:bg-[#1F3939] disabled:opacity-50">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
