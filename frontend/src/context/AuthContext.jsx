import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=logged
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await http.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    setError("");
    try {
      await http.post("/auth/login", { email, password });
      await refresh();
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const register = async (name, email, password, currency = "INR") => {
    setError("");
    try {
      await http.post("/auth/register", { name, email, password, currency });
      await refresh();
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } catch (e) {
      console.warn("logout call failed:", e?.message);
    }
    setUser(false);
  };

  const setCurrency = async (currency) => {
    await http.patch("/auth/currency", { currency });
    setUser((u) => ({ ...u, currency }));
  };

  const switchLedger = async (ledgerId) => {
    await http.post(`/ledgers/${ledgerId}/switch`);
    await refresh();
  };

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, error, setCurrency, refresh, switchLedger }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
