import { useEffect } from "react";

// Keep these in sync with public/index.html defaults
export const SITE_URL = "https://apkamunim.com";
export const DEFAULT_TITLE = "Apka Munim — Hinglish Expense & Udhaar Tracker";
export const DEFAULT_DESCRIPTION =
  "Apka Munim — Hinglish personal finance tracker. Track income, kharcha, udhaar (lene/dene), multiple accounts, budgets aur AI insights.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMetaByName(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Dependency-free SEO hook for a CRA + react-router SPA.
 * Sets document.title, meta description, canonical URL, robots directive,
 * and Open Graph / Twitter tags for the currently mounted route.
 *
 * Usage:
 *   useSEO({
 *     title: "Privacy Policy | Apka Munim",
 *     description: "...",
 *     path: "/privacy",
 *   });
 *
 * Pass noindex: true for auth/utility routes that shouldn't be indexed
 * (login, forgot-password, reset-password, and all logged-in app pages).
 */
export default function useSEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  noindex = false,
} = {}) {
  useEffect(() => {
    const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;

    document.title = title;
    setMetaByName("description", description);
    setMetaByName("robots", noindex ? "noindex, nofollow" : "index, follow");

    setMetaByProperty("og:title", title);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:url", url);
    setMetaByProperty("og:image", image);

    setMetaByName("twitter:title", title);
    setMetaByName("twitter:description", description);
    setMetaByName("twitter:image", image);

    setCanonical(url);

    // Reset to site defaults when the route unmounts so nothing leaks
    // into whichever page mounts next (e.g. during route transitions).
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, path, image, noindex]);
}
