import React, { createContext, useContext, useEffect, useState } from "react";

export const WIDGET_DEFS = [
  { key: "stats", label: "Top Stats (Balance/Aaya/Gaya/Udhaar)", default: true, locked: true },
  { key: "vibe", label: "Munim Ji Ki Vibe (meme card)", default: true },
  { key: "health", label: "Financial Health Score", default: true },
  { key: "streak", label: "Daily Streak", default: true },
  { key: "networth", label: "Net Worth", default: true },
  { key: "emergency", label: "Emergency Fund Health Check", default: true },
  { key: "badges", label: "Achievements / Badges", default: true },
  { key: "recent", label: "Recent Transactions", default: true },
  { key: "accounts", label: "Accounts Widget", default: true },
];

const DEFAULT = WIDGET_DEFS.reduce((acc, w) => ({ ...acc, [w.key]: w.default }), {});

const Ctx = createContext({ widgets: DEFAULT, setWidget: () => {}, reset: () => {} });

export function DashboardPrefsProvider({ children }) {
  const [widgets, setWidgets] = useState(() => {
    try {
      const raw = localStorage.getItem("am_dashboard_widgets");
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    try { localStorage.setItem("am_dashboard_widgets", JSON.stringify(widgets)); } catch {}
  }, [widgets]);

  const setWidget = (key, value) => setWidgets((w) => ({ ...w, [key]: value }));
  const reset = () => setWidgets(DEFAULT);

  return <Ctx.Provider value={{ widgets, setWidget, reset }}>{children}</Ctx.Provider>;
}

export const useDashboardPrefs = () => useContext(Ctx);
