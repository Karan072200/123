/**
 * Hosts where the Google OAuth Client ID's Authorized JavaScript origins
 * are known to be correctly configured. Anywhere else (preview URLs, staging,
 * localhost with a non-whitelisted port) the GSI button will silently fail
 * with "[GSI_LOGGER]: The given origin is not allowed" — surfaced via the
 * proactive GoogleAuthErrorHelp banner.
 *
 * Update this list when a new production/staging host is whitelisted in
 * Google Cloud Console.
 */
export const KNOWN_GOOD_GOOGLE_HOSTS = new Set([
  "apkamunim.com",
  "www.apkamunim.com",
]);

export function isKnownGoodGoogleOrigin() {
  if (typeof window === "undefined") return true; // SSR: don't warn
  const host = window.location.hostname || "";
  return KNOWN_GOOD_GOOGLE_HOSTS.has(host);
}
