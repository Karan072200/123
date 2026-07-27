import React from "react";
import { Calendar } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Aaj" },
  { key: "yesterday", label: "Kal" },
  { key: "week", label: "Iss Hafta" },
  { key: "month", label: "Iss Maheena" },
  { key: "year", label: "Iss Saal" },
  { key: "all", label: "All Time" },
];

export function computeRange(preset) {
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
    default:
      return { from: null, to: null };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function DateFilter({ value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`} data-testid="date-filter">
      <Calendar className="w-4 h-4 text-[#78716C] hidden md:inline" />
      {PRESETS.map((p) => (
        <button
          key={p.key}
          data-testid={`date-preset-${p.key}`}
          onClick={() => onChange(p.key)}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            value === p.key
              ? "bg-[#2A4F4F] text-white"
              : "bg-[#F2F0EA] text-[#57534E] hover:bg-[#E7E5DF]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
