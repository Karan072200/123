import React, { useEffect, useRef, useState } from "react";
import { http } from "@/lib/api";
import { usePremium } from "@/context/PremiumContext";
import { X, Sparkles } from "lucide-react";

/**
 * Ad slot abstraction (max 3 ads/day for free & trial users, never for Premium).
 *
 * This project is a web React app, so the native Google AdMob SDK can't run
 * directly in the browser. The daily cap, reset, and premium bypass are all
 * enforced by the backend (`/ads/status`, `/ads/track`) so the logic here
 * stays correct regardless of what actually renders. Once the app is wrapped
 * with Capacitor for Android/iOS, swap the placeholder markup below for
 * `@capacitor-community/admob` calls (AdMob.showBanner / showInterstitial /
 * showRewardedInterstitial) — no changes needed anywhere else.
 */
export default function AdSlot({ trigger = true }) {
  const { premiumActive, status } = usePremium();
  const [visible, setVisible] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (premiumActive || !trigger || requestedRef.current || !status) return;
    requestedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await http.get("/ads/status");
        if (cancelled || !data.ads_enabled || data.remaining <= 0) return;
        await http.post("/ads/track");
        if (!cancelled) setVisible(true);
      } catch {
        // Ads should never block or break the app.
      }
    })();
    return () => { cancelled = true; };
  }, [premiumActive, trigger, status]);

  if (premiumActive || !visible) return null;

  return (
    <div
      data-testid="ad-slot"
      className="relative bg-[#F2F0EA] border border-[#E7E5DF] rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-[#78716C] mb-4"
    >
      <span className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#D96C52]" />
        Go Premium for an ad-free experience
      </span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Close ad"
        data-testid="ad-slot-close"
        className="text-[#A8A29E] hover:text-[#57534E] flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
