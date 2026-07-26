import React, { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Monitor, Smartphone, MapPin } from "lucide-react";

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "abhi";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m pehle`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h pehle`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d pehle`;
}

function deviceLabel(ua) {
  if (!ua) return "Unknown device";
  const isMobile = /Mobi|Android|iPhone/i.test(ua);
  const browser = /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox"
    : /Safari/i.test(ua) ? "Safari"
    : /Edg/i.test(ua) ? "Edge"
    : "Browser";
  return `${browser} · ${isMobile ? "Mobile" : "Desktop"}`;
}

const methodLabel = {
  password: "Password login",
  google: "Google login",
  "2fa": "2FA login",
};

export default function LoginActivitySection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/auth/login-activity");
      setRows(data.activity || []);
    } catch (e) {
      console.warn("login-activity failed:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white border border-[#E7E5DF] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Monitor className="w-4 h-4 text-[#2A4F4F]" />
        <div className="font-heading font-semibold text-[#1C1917]">Login Activity</div>
      </div>
      <div className="text-xs text-[#78716C] mb-3">Aapka account kahan-kahan login hua hai</div>

      {loading ? (
        <div className="text-xs text-[#78716C]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-[#78716C]">Koi login activity nahi mili.</div>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} data-testid={`login-activity-${r.id}`}
              className="flex items-start justify-between gap-3 text-xs bg-[#F9F8F6] border border-[#E7E5DF] rounded-lg px-3 py-2">
              <div className="flex items-start gap-2 min-w-0">
                <Smartphone className="w-3.5 h-3.5 text-[#78716C] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-[#1C1917] truncate">
                    {methodLabel[r.method] || r.method}
                  </div>
                  <div className="text-[#78716C] truncate">{deviceLabel(r.user_agent)}</div>
                  <div className="flex items-center gap-1 text-[#A8A29E] mt-0.5">
                    <MapPin className="w-3 h-3" /> {r.ip || "unknown IP"}
                  </div>
                </div>
              </div>
              <div className="text-[#A8A29E] shrink-0 whitespace-nowrap">{timeAgo(r.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
