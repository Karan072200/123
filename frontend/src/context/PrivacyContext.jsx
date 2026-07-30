import React, { createContext, useContext, useEffect, useState } from "react";

const PrivacyCtx = createContext({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("am_privacy") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("am_privacy", hidden ? "1" : "0"); } catch {}
  }, [hidden]);
  return (
    <PrivacyCtx.Provider value={{ hidden, toggle: () => setHidden((v) => !v) }}>
      {children}
    </PrivacyCtx.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyCtx);

/** Wrap a currency/number display to blur when privacy is on */
export function MoneyValue({ children, className = "" }) {
  const { hidden } = usePrivacy();
  if (hidden) return <span className={`select-none tracking-wider ${className}`}>••••••</span>;
  return <span className={className}>{children}</span>;
}
