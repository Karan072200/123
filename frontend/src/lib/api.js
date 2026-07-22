import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  withCredentials: true,
});

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
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
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
    // Via SW when available (works even if tab lost focus)
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
