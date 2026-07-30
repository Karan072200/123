import React, { useState } from "react";
import { http } from "@/lib/api";
import { Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable GSTIN input with structural autofill.
 * Given a valid 15-char GSTIN it calls /api/gstin/lookup/{gstin} and
 * fires `onExtract({ state_name, pan, entity_type, ... })` so the parent
 * form can pre-fill any linked fields.
 *
 * Props:
 *  - value: current GSTIN string
 *  - onChange: (upperCased) => void
 *  - onExtract: (data) => void   // called on successful lookup
 *  - testIdPrefix: string        // e.g. "party" -> data-testid="party-gstin-input"
 */
export default function GstinInput({
  value,
  onChange,
  onExtract,
  testIdPrefix = "gstin",
  placeholder = "e.g. 27ABCDE1234F1Z5",
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  const doLookup = async () => {
    const g = (value || "").trim().toUpperCase();
    if (!g) {
      toast.error("GSTIN daalo");
      return;
    }
    setLoading(true);
    setOk(false);
    try {
      const { data } = await http.get(`/gstin/lookup/${g}`);
      setOk(true);
      onExtract?.(data);
      toast.success(`${data.state_name} · ${data.entity_type}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Invalid GSTIN";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-stretch gap-2 ${className}`}>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => {
          setOk(false);
          onChange?.(e.target.value.toUpperCase());
        }}
        onBlur={() => {
          if ((value || "").length === 15) doLookup();
        }}
        maxLength={15}
        placeholder={placeholder}
        data-testid={`${testIdPrefix}-gstin-input`}
        className="flex-1 h-10 px-3 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-md text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={doLookup}
        disabled={loading || !(value || "").length}
        data-testid={`${testIdPrefix}-gstin-fetch-btn`}
        className="px-3 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
        title="Fetch details from GSTIN"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : ok ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Search className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{ok ? "Auto-filled" : "Fetch"}</span>
      </button>
    </div>
  );
}
