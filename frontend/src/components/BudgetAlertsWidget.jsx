import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Bell } from "lucide-react";

export default function BudgetAlertsWidget() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [alerts, setAlerts] = useState([]);
  const [countOver, setCountOver] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await http.get("/budgets/alerts").then((r) => r.data);
      setAlerts(r.alerts || []);
      setCountOver(r.count_over || 0);
    } catch (e) {
      console.warn("budgets/alerts failed:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <div
      data-testid="budget-alerts-widget"
      className="bg-white border border-[#E7E5DF] rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#8B6220]" />
          <h2 className="font-heading text-base font-semibold text-[#1C1917]">Budget Alerts</h2>
        </div>
        {countOver > 0 && (
          <span
            data-testid="budget-alerts-over-count"
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D96C52]/10 text-[#B15039] border border-[#D96C52]/20"
          >
            {countOver} over budget
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {alerts.map((a) => {
          const isOver = a.level === "over";
          return (
            <li
              key={a.category}
              data-testid={`budget-alert-${a.category}`}
              className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${
                isOver ? "bg-[#D96C52]/10" : "bg-[#E8B365]/15"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isOver ? "text-[#B15039]" : "text-[#8B6220]"}`} />
                <span className="font-medium text-[#1C1917] truncate">{a.category}</span>
              </div>
              <div className={`font-semibold ${isOver ? "text-[#B15039]" : "text-[#8B6220]"}`}>
                {formatMoney(a.spent, cur)} / {formatMoney(a.budget, cur)}
                <span className="opacity-70 font-normal"> · {a.percent.toFixed(0)}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
