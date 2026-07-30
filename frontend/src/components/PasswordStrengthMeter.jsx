import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

export function checkPasswordStrength(password) {
  const rules = [
    { key: "length", label: "8+ characters", ok: password.length >= 8 },
    { key: "upper", label: "1 UPPERCASE", ok: /[A-Z]/.test(password) },
    { key: "lower", label: "1 lowercase", ok: /[a-z]/.test(password) },
    { key: "digit", label: "1 number", ok: /[0-9]/.test(password) },
    { key: "special", label: "1 special char (!@#$%)", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?~`]/.test(password) },
  ];
  const passed = rules.filter(r => r.ok).length;
  return { rules, passed, total: rules.length, isValid: passed === rules.length };
}

export default function PasswordStrengthMeter({ password }) {
  const { rules, passed, total, isValid } = useMemo(() => checkPasswordStrength(password), [password]);

  if (!password) return null;

  const strengthLabel =
    passed <= 1 ? "Bahut Weak" :
    passed === 2 ? "Weak" :
    passed === 3 ? "Fair" :
    passed === 4 ? "Good" :
    "Strong";

  const strengthColor =
    passed <= 1 ? "#D96C52" :
    passed === 2 ? "#D96C52" :
    passed === 3 ? "#E8B365" :
    passed === 4 ? "#4A7C59" :
    "#3B6446";

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength-meter">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-1 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= passed ? strengthColor : "#E7E5DF" }} />
          ))}
        </div>
        <span className="text-xs font-semibold ml-3" style={{ color: strengthColor }}>
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map(r => (
          <div key={r.key} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? "text-[#4A7C59]" : "text-[#A8A29E]"}`}>
            {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
