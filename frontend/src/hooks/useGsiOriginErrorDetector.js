import { useEffect } from "react";

/**
 * Watches console.error for the specific GSI (Google Identity Services) log
 * pattern that fires when the current window.location.origin is NOT in the
 * OAuth Client's Authorized JavaScript origins list.
 *
 *   [GSI_LOGGER]: The given origin is not allowed for the given client ID.
 *
 * @react-oauth/google's <GoogleLogin> onError prop does NOT capture this — GSI
 * silently no-ops the click and only writes to console. This hook sniffs for
 * the exact log and calls onDetected() so we can surface an inline banner.
 *
 * Safe to mount on every login/register page; cleanup restores the original
 * console.error on unmount.
 */
export default function useGsiOriginErrorDetector(onDetected) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.console) return;
    const original = window.console.error;

    const matches = (args) => {
      try {
        const flat = args
          .map((a) => (typeof a === "string" ? a : ""))
          .join(" ");
        return (
          flat.includes("GSI_LOGGER") &&
          /origin is not allowed/i.test(flat)
        );
      } catch {
        return false;
      }
    };

    window.console.error = function (...args) {
      if (matches(args)) {
        try {
          onDetected?.();
        } catch {
          /* swallow so we never break console.error */
        }
      }
      return original.apply(this, args);
    };

    return () => {
      window.console.error = original;
    };
  }, [onDetected]);
}
