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
