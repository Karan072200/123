import React, { useState } from "react";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * Inline diagnostic banner shown when Google Sign-In fails.
 * The @react-oauth/google GoogleLogin button silently fails when the current
 * browser origin is not whitelisted in Google Cloud Console. GSI logs
 * "The given origin is not allowed for the given client ID" to the console,
 * but nothing user-visible appears — a confusing dead-end.
 *
 * This banner surfaces the exact origin the user must add + a copy button + a
 * direct link to Google Cloud Console credentials page.
 */
export default function GoogleAuthErrorHelp() {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      toast.success("Origin copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div
      data-testid="google-auth-error-help"
      className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold">Google Sign-In blocked</div>
          <div className="mt-0.5 leading-relaxed">
            Iss URL par abhi Google login allow nahi hai. Google Cloud Console me{" "}
            <b>Authorized JavaScript origins</b> me ye origin add karo — 2 min ka kaam:
          </div>
          <div className="mt-2 flex items-center gap-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded p-2 font-mono">
            <span className="truncate flex-1" data-testid="google-auth-error-origin">
              {origin}
            </span>
            <button
              onClick={copy}
              data-testid="google-auth-error-copy-btn"
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
              title="Copy origin"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copied && (
            <div className="text-[10px] mt-1 text-emerald-700 dark:text-emerald-400">
              ✓ Copied — paste kar do niche wali link me
            </div>
          )}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="google-auth-error-console-link"
            className="mt-2 inline-flex items-center gap-1 font-semibold underline"
          >
            Open Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>
          <ol className="mt-2 list-decimal list-inside space-y-0.5 text-[11px] leading-relaxed">
            <li>Apna OAuth 2.0 Client ID kholo</li>
            <li>"Authorized JavaScript origins" me <b>+ Add URI</b> click karo</li>
            <li>Upar wala origin paste karo aur <b>Save</b> karo</li>
            <li>Yahaan wapas aake page refresh karo — ho gaya!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
