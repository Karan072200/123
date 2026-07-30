import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

/**
 * Lightweight i18n for Apka Munim.
 * - Not a full react-i18next setup (kept surgical to avoid bundle bloat).
 * - Strings that are NOT present in a chosen language fall back to English.
 * - Persisted in localStorage under "am_lang".
 */

const en = {
  // Header / Primary nav
  dashboard: "Dashboard",
  transactions: "Transactions",
  billing: "Billing",
  search: "Search",
  privacy_on: "Hide amounts",
  privacy_off: "Show amounts",
  theme_toggle: "Toggle theme",
  sign_out: "Sign Out",
  sign_in: "Sign in",
  // Menu section headings
  section_business: "Business",
  section_products: "Products & Inventory",
  section_payments: "Payments",
  section_expense: "Expense & Income",
  section_sales_reports: "Sales Reports",
  section_purchase_reports: "Purchase Reports",
  section_business_reports: "Business Reports",
  section_other_features: "Other Features",
  section_account: "Account",
  // Common
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  view: "View",
  print: "Print",
  share: "Share",
  create: "Create",
  language: "Language",
  currency: "Currency",
  // Billing subnav
  overview: "Overview",
  sales: "Sales",
  purchase: "Purchase",
  parties: "Parties",
  inventory: "Inventory",
  outstanding: "Outstanding",
  ledgers: "Ledgers",
  payments: "Payments",
  bank_match: "Bank Match",
  reports: "Reports",
  expenses_income: "Expenses & Income",
  // Billing dashboard
  financial_year: "Financial Year",
  refresh: "Refresh",
  new_invoice: "New Invoice",
  total_sales: "Total Sales",
  total_purchase: "Total Purchase",
  receivables: "Receivables",
  payables: "Payables",
  todays_sales: "Today's Sales",
  todays_receipts: "Today's Receipts",
  stock_value: "Stock Value",
  net_outstanding: "Net Outstanding",
};

const hi = {
  dashboard: "डैशबोर्ड",
  transactions: "लेनदेन",
  billing: "बिलिंग",
  search: "खोजें",
  privacy_on: "राशि छिपाएँ",
  privacy_off: "राशि दिखाएँ",
  theme_toggle: "थीम बदलें",
  sign_out: "लॉग आउट",
  sign_in: "लॉग इन",
  section_business: "बिज़नेस",
  section_products: "प्रोडक्ट्स और स्टॉक",
  section_payments: "पेमेंट्स",
  section_expense: "खर्चा और आय",
  section_sales_reports: "सेल्स रिपोर्ट्स",
  section_purchase_reports: "पर्चेज़ रिपोर्ट्स",
  section_business_reports: "बिज़नेस रिपोर्ट्स",
  section_other_features: "अन्य फ़ीचर्स",
  section_account: "अकाउंट",
  save: "सेव",
  cancel: "रद्द",
  delete: "डिलीट",
  edit: "एडिट",
  view: "देखें",
  print: "प्रिंट",
  share: "शेयर",
  create: "बनाएँ",
  language: "भाषा",
  currency: "मुद्रा",
  overview: "ओवरव्यू",
  sales: "सेल्स",
  purchase: "पर्चेज़",
  parties: "पार्टियाँ",
  inventory: "इन्वेंटरी",
  outstanding: "बकाया",
  ledgers: "खाता बही",
  payments: "पेमेंट्स",
  bank_match: "बैंक मैच",
  reports: "रिपोर्ट्स",
  expenses_income: "खर्चा और आय",
  financial_year: "वित्तीय वर्ष",
  refresh: "रिफ्रेश",
  new_invoice: "नया इनवॉइस",
  total_sales: "कुल बिक्री",
  total_purchase: "कुल खरीद",
  receivables: "लेना है",
  payables: "देना है",
  todays_sales: "आज की बिक्री",
  todays_receipts: "आज के भुगतान",
  stock_value: "स्टॉक मूल्य",
  net_outstanding: "कुल बकाया",
};

const gu = {
  dashboard: "ડેશબોર્ડ",
  transactions: "વ્યવહાર",
  billing: "બિલિંગ",
  search: "શોધો",
  privacy_on: "રકમ છુપાવો",
  privacy_off: "રકમ બતાવો",
  sign_out: "લોગ આઉટ",
  sign_in: "લોગ ઇન",
  section_business: "બિઝનેસ",
  section_products: "પ્રોડક્ટ્સ અને સ્ટોક",
  section_payments: "પેમેન્ટ્સ",
  section_expense: "ખર્ચ અને આવક",
  section_sales_reports: "વેચાણ રિપોર્ટ્સ",
  section_purchase_reports: "ખરીદી રિપોર્ટ્સ",
  section_business_reports: "બિઝનેસ રિપોર્ટ્સ",
  section_other_features: "અન્ય ફીચર્સ",
  section_account: "એકાઉન્ટ",
  save: "સાચવો",
  cancel: "રદ કરો",
  delete: "ડિલીટ",
  edit: "એડિટ",
  view: "જુઓ",
  create: "બનાવો",
  language: "ભાષા",
  currency: "ચલણ",
  overview: "ઓવરવ્યુ",
  sales: "વેચાણ",
  purchase: "ખરીદી",
  parties: "પક્ષો",
  inventory: "ઇન્વેન્ટરી",
  outstanding: "બાકી",
  reports: "રિપોર્ટ્સ",
  new_invoice: "નવો ઇનવોઇસ",
  financial_year: "નાણાકીય વર્ષ",
};

const mr = {
  dashboard: "डॅशबोर्ड",
  transactions: "व्यवहार",
  billing: "बिलिंग",
  search: "शोधा",
  privacy_on: "रक्कम लपवा",
  privacy_off: "रक्कम दाखवा",
  sign_out: "बाहेर पडा",
  sign_in: "लॉग इन",
  section_business: "बिझनेस",
  section_products: "उत्पादने आणि स्टॉक",
  section_payments: "पेमेंट्स",
  section_expense: "खर्च आणि उत्पन्न",
  section_account: "खाते",
  save: "जतन",
  cancel: "रद्द",
  delete: "हटवा",
  edit: "एडिट",
  view: "पहा",
  create: "तयार करा",
  language: "भाषा",
  currency: "चलन",
  new_invoice: "नवीन इनव्हॉइस",
  financial_year: "आर्थिक वर्ष",
  reports: "अहवाल",
  outstanding: "बाकी",
};

const ta = {
  dashboard: "டாஷ்போர்டு",
  transactions: "பரிவர்த்தனைகள்",
  billing: "பில்லிங்",
  search: "தேடு",
  privacy_on: "தொகை மறை",
  privacy_off: "தொகை காட்டு",
  sign_out: "வெளியேறு",
  sign_in: "உள்நுழை",
  section_business: "வணிகம்",
  section_account: "கணக்கு",
  save: "சேமி",
  cancel: "ரத்து",
  delete: "நீக்கு",
  edit: "திருத்து",
  view: "காண்",
  create: "உருவாக்கு",
  language: "மொழி",
  currency: "நாணயம்",
  new_invoice: "புதிய இன்வாய்ஸ்",
  financial_year: "நிதி ஆண்டு",
  reports: "அறிக்கைகள்",
};

const te = {
  dashboard: "డాష్‌బోర్డ్",
  transactions: "లావాదేవీలు",
  billing: "బిల్లింగ్",
  search: "వెతకండి",
  privacy_on: "మొత్తం దాచు",
  privacy_off: "మొత్తం చూపించు",
  sign_out: "లాగ్ అవుట్",
  sign_in: "లాగిన్",
  section_business: "వ్యాపారం",
  section_account: "ఖాతా",
  save: "సేవ్",
  cancel: "రద్దు",
  delete: "తొలగించు",
  edit: "ఎడిట్",
  view: "వీక్షించండి",
  create: "సృష్టించు",
  language: "భాష",
  currency: "కరెన్సీ",
  new_invoice: "కొత్త ఇన్వాయిస్",
  financial_year: "ఆర్థిక సంవత్సరం",
  reports: "నివేదికలు",
};

const bn = {
  dashboard: "ড্যাশবোর্ড",
  transactions: "লেনদেন",
  billing: "বিলিং",
  search: "অনুসন্ধান",
  sign_out: "সাইন আউট",
  sign_in: "সাইন ইন",
  save: "সংরক্ষণ",
  cancel: "বাতিল",
  delete: "মুছুন",
  edit: "সম্পাদনা",
  create: "তৈরি করুন",
  language: "ভাষা",
  currency: "মুদ্রা",
  new_invoice: "নতুন চালান",
  financial_year: "আর্থিক বছর",
};

const DICTS = { en, hi, gu, mr, ta, te, bn };

export const LANGUAGES = [
  { code: "en", label: "English",     native: "English" },
  { code: "hi", label: "Hindi",       native: "हिंदी" },
  { code: "gu", label: "Gujarati",    native: "ગુજરાતી" },
  { code: "mr", label: "Marathi",     native: "मराठी" },
  { code: "ta", label: "Tamil",       native: "தமிழ்" },
  { code: "te", label: "Telugu",      native: "తెలుగు" },
  { code: "bn", label: "Bengali",     native: "বাংলা" },
];

const LangCtx = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("am_lang") || "en"; }
    catch { return "en"; }
  });

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem("am_lang", l); } catch {}
    // Also help the browser: <html lang="…">
    try { document.documentElement.setAttribute("lang", l); } catch {}
  };

  useEffect(() => {
    try { document.documentElement.setAttribute("lang", lang); } catch {}
  }, [lang]);

  const value = useMemo(() => {
    const dict = DICTS[lang] || en;
    const t = (key, fallback) => {
      if (dict[key]) return dict[key];
      if (en[key]) return en[key];
      return fallback ?? key;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
