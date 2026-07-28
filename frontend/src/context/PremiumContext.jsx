import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PremiumCtx = createContext(null);

const REMINDER_KEY = "am_trial_reminder_last_shown";

export const PremiumProvider = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null); // null = unknown/loading
  const [plans, setPlans] = useState([]);
  const [lockedFeature, setLockedFeature] = useState(null); // string|null
  const [showReminder, setShowReminder] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await http.get("/premium/status");
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setStatus(null);
  }, [user, refresh]);

  useEffect(() => {
    http.get("/premium/plans").then(({ data }) => setPlans(data.plans || [])).catch(() => {});
  }, []);

  // 7-days-before-expiry popup — shown at most once per day.
  useEffect(() => {
    if (!status?.show_trial_reminder) return;
    const today = new Date().toDateString();
    let lastShown = null;
    try { lastShown = localStorage.getItem(REMINDER_KEY); } catch { /* ignore */ }
    if (lastShown !== today) {
      setShowReminder(true);
      try { localStorage.setItem(REMINDER_KEY, today); } catch { /* ignore */ }
    }
  }, [status]);

  const subscribe = async (plan, extra = {}) => {
    const { data } = await http.post("/premium/subscribe", { plan, ...extra });
    setStatus(data);
    return data;
  };

  const restore = async () => {
    const { data } = await http.post("/premium/restore");
    setStatus(data);
    return data;
  };

  const openLocked = (featureName) => setLockedFeature(featureName || "This feature");
  const closeLocked = () => setLockedFeature(null);

  const premiumActive = !!status?.premium_active;

  /** Returns true if the free-vs-premium check passes; otherwise opens the
   *  locked-feature dialog for `featureName` and returns false. */
  const gate = (featureName) => {
    if (premiumActive) return true;
    openLocked(featureName);
    return false;
  };

  return (
    <PremiumCtx.Provider
      value={{
        status, premiumActive, plans, refresh, subscribe, restore,
        lockedFeature, openLocked, closeLocked, gate,
        showReminder, dismissReminder: () => setShowReminder(false),
      }}
    >
      {children}
    </PremiumCtx.Provider>
  );
};

export const usePremium = () => useContext(PremiumCtx);
