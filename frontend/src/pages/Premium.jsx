import React, { useEffect, useState } from "react";
import { usePremium } from "@/context/PremiumContext";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";

const FEATURE_ROWS = [
  "Unlimited AI",
  "Unlimited Reports",
  "Unlimited PDF Export",
  "Cloud Backup",
  "Business Analytics",
  "Ad-Free Experience",
  "Priority Support",
];

const BEST_VALUE_PLAN_ID = "yearly";

export default function Premium() {
  const { status, plans, subscribe, restore, refresh } = usePremium();
  const [busyPlan, setBusyPlan] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const doSubscribe = async (planId) => {
    setBusyPlan(planId);
    try {
      await subscribe(planId);
      toast.success("Premium activated! 🎉");
    } catch (e) {
      toast.error(e.response?.data?.detail?.message || e.response?.data?.detail || "Kuch galat ho gaya, dobara try karo.");
    } finally {
      setBusyPlan(null);
    }
  };

  const doRestore = async () => {
    setRestoring(true);
    try {
      await restore();
      toast.success("Purchase status refreshed");
    } catch {
      toast.error("Restore fail ho gaya");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="premium-page">
      <div className="text-center max-w-lg mx-auto">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#D96C52]/10 flex items-center justify-center mb-3">
          <Crown className="w-7 h-7 text-[#D96C52]" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Go Premium</h1>
        <p className="text-sm text-[#57534E] mt-2">
          {status?.status === "trial"
            ? `Aapke free trial mein ${status.trial_days_left} din baaki hain.`
            : status?.status === "premium"
            ? "Aap already Premium member hain — dhanyavaad!"
            : "Unlimited AI, reports, cloud backup aur ad-free experience unlock karo."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 max-w-md mx-auto">
        {FEATURE_ROWS.map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm text-[#1C1917]">
            <Check className="w-4 h-4 text-[#4A7C59] flex-shrink-0" /> {f}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
        {plans.map((p) => {
          const isBest = p.id === BEST_VALUE_PLAN_ID;
          const isCurrent = status?.status === "premium" && status?.plan === p.id;
          return (
            <div
              key={p.id}
              data-testid={`premium-plan-${p.id}`}
              className={`relative bg-white rounded-xl p-5 border-2 flex flex-col ${
                isBest ? "border-[#D96C52] shadow-lg" : "border-[#E7E5DF]"
              }`}
            >
              {isBest && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D96C52] text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full">
                  Best Value
                </span>
              )}
              <div className="text-sm font-semibold text-[#78716C]">{p.label}</div>
              <div className="font-heading text-2xl font-bold text-[#1C1917] mt-1">₹{p.price}</div>
              <div className="text-xs text-[#A8A29E] mb-4">
                {p.duration_days ? `for ${p.label.toLowerCase()}` : "one-time"}
              </div>
              <Button
                onClick={() => doSubscribe(p.id)}
                disabled={busyPlan === p.id || isCurrent}
                data-testid={`premium-plan-btn-${p.id}`}
                className={`mt-auto w-full rounded-full text-white ${
                  isBest ? "bg-[#D96C52] hover:bg-[#c25a41]" : "bg-[#2A4F4F] hover:bg-[#1F3B3B]"
                }`}
              >
                {isCurrent ? "Current Plan" : busyPlan === p.id ? "…" : "Choose Plan"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={doRestore}
          disabled={restoring}
          data-testid="premium-restore-btn"
          className="text-xs text-[#2A4F4F] hover:underline"
        >
          {restoring ? "Restoring…" : "Restore Purchase"}
        </button>
      </div>
    </div>
  );
}
