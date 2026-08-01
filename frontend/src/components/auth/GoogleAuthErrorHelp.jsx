import React, { useState } from "react";
import { AlertTriangle, Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Inline diagnostic banner shown when the current browser origin is very
 * likely NOT whitelisted in Google Cloud Console's Authorized JavaScript
 * origins list. See /app/GOOGLE_OAUTH_FIX.md for the full fix.
 *
 * Rendered proactively on any host outside KNOWN_GOOD_GOOGLE_HOSTS. Users
 * can dismiss it — dismissal is persisted per origin in localStorage.
 */
export default function GoogleAuthErrorHelp() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const dismissKey = `gsi-help-dismissed:${origin}`;
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

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

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore quota errors */
    }
    setDismissed(true);
  };

  return (
    <div
      data-testid="google-auth-error-help"
      className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold">Google Sign-In may be blocked here</div>
            <button
              onClick={dismiss}
              data-testid="google-auth-error-dismiss-btn"
              aria-label="Dismiss"
              className="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 -mr-1 -mt-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-0.5 leading-relaxed">
            Iss URL par Google login tab hi chalega jab ye origin{" "}
            <b>Authorized JavaScript origins</b> me added ho. 2 min ka kaam:
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
