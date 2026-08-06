import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  withCredentials: true,
});

/**
 * Refresh-token interceptor (Phase 3 Security Hardening).
 *
 * Whenever the server returns 401 on an authenticated request, try to swap
 * the stored refresh token for a new access cookie once, then replay the
 * original request. If refresh fails, fall through to the caller so login
 * flows still see the 401.
 *
 * The refresh token is stored under `apka-refresh` in localStorage and is
 * only set after a user explicitly opts in via /security → "New Refresh
 * Session". Existing cookie-only clients keep working unchanged.
 */
const REFRESH_KEY = "apka-refresh";
let _refreshing = null;

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const refreshToken = typeof window !== "undefined" ? window.localStorage?.getItem(REFRESH_KEY) : null;
    const alreadyRetried = original._retryAuth;
    const isAuthRoute = (original.url || "").includes("/auth/refresh") || (original.url || "").includes("/auth/login") || (original.url || "").includes("/auth/register");
    if (error?.response?.status === 401 && refreshToken && !alreadyRetried && !isAuthRoute) {
      try {
        if (!_refreshing) {
          _refreshing = axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken }, { withCredentials: true });
        }
        const { data } = await _refreshing;
        _refreshing = null;
        if (data?.refresh_token) {
          window.localStorage.setItem(REFRESH_KEY, data.refresh_token);
        }
        original._retryAuth = true;
        return http(original);
      } catch (e) {
        _refreshing = null;
        window.localStorage.removeItem(REFRESH_KEY);
      }
    }
    return Promise.reject(error);
  }
);

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

export const currencySymbol = (code) =>
  (CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]).symbol;

export const formatMoney = (amount, code = "INR") => {
  const symbol = currencySymbol(code);
  const n = Number(amount || 0);
  return `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const CATEGORIES = {
  income: ["Salary", "Business", "Freelance", "Investment", "Gift", "Other Income"],
  expense: [
    "Food", "Groceries", "Rent", "Transport", "Shopping",
    "Bills", "Entertainment", "Health", "Education", "Travel", "Other",
  ],
};

export const ACCOUNT_TYPES = [
  { value: "savings", label: "💰 Savings" },
  { value: "current", label: "🏢 Current" },
  { value: "cash", label: "💵 Cash" },
  { value: "wallet", label: "📱 Wallet (UPI/PayTM)" },
  { value: "credit_card", label: "💳 Credit Card" },
  { value: "emergency", label: "🛡️ Emergency Fund" },
  { value: "investment", label: "📈 Investment (SIP/FD/Stocks)" },
  { value: "other", label: "📦 Other" },
];

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  if (detail && typeof detail.message === "string") return detail.message;
  return String(detail);
}

// Notification helpers for budget breach alerts
export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

export function showBudgetNotification(alert, currency = "INR") {
  const symbol = currencySymbol(currency);
  const title =
    alert.level === "over"
      ? `Budget cross ho gaya: ${alert.category}!`
      : `Budget alert: ${alert.category}`;
  const body =
    alert.level === "over"
      ? `${symbol}${alert.spent} / ${symbol}${alert.budget} (${alert.percent}%) — limit paar!`
      : `${symbol}${alert.spent} / ${symbol}${alert.budget} (${alert.percent}%) — budget khatam hone wala hai.`;
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body, icon: "/icon-192.png", badge: "/icon-192.png",
          tag: `budget-${alert.category}`,
          data: { url: "/budgets" },
        });
      });
    } else {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch (e) {
    console.warn("notification failed:", e?.message);
  }
}

// ADDING DEFAULT EXPORT TO FIX VERCEL IMPORT ERRORS PERMANENTLY
const api = http;
export default api;
