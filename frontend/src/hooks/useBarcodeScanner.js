import { useEffect, useRef, useCallback } from "react";

/**
 * useBarcodeScanner — captures rapid keystrokes from a USB barcode scanner
 * (or a phone camera app that emulates keyboard) and fires onScan(code).
 *
 * Detection strategy:
 *   - Barcode scanners type characters very fast (each keystroke < 30ms apart)
 *   - They finish with an Enter keypress
 *   - So we buffer characters that arrive with tight timing and, when Enter
 *     is pressed, if the buffer has >= 4 chars and average inter-key time
 *     is < 40ms, treat as a scan and fire onScan()
 *
 * The hook attaches a global keydown listener, so it must be enabled only
 * on pages that expect scanning. Pass `enabled: false` to detach.
 */
export function useBarcodeScanner({ onScan, enabled = true, minLength = 4, maxAvgInterval = 40 } = {}) {
  const bufferRef = useRef({ chars: [], times: [] });

  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;
    // Ignore modifier-key events and typing into contentEditable other than plain inputs
    const tag = (e.target?.tagName || "").toLowerCase();
    const isEditable = tag === "textarea" || (tag === "input" && ["email", "url", "search", "tel", "password"].includes(e.target.type));
    // Skip password inputs
    if (isEditable) return;

    const now = Date.now();
    const b = bufferRef.current;

    if (e.key === "Enter") {
      if (b.chars.length >= minLength) {
        const intervals = b.times.slice(1).map((t, i) => t - b.times[i]);
        const avg = intervals.reduce((s, x) => s + x, 0) / (intervals.length || 1);
        if (avg <= maxAvgInterval) {
          const code = b.chars.join("");
          onScan?.(code);
          e.preventDefault();
        }
      }
      bufferRef.current = { chars: [], times: [] };
      return;
    }

    // Only track printable single-char keys
    if (e.key.length === 1) {
      // reset buffer if the last keystroke was more than 300ms ago
      if (b.times.length && now - b.times[b.times.length - 1] > 300) {
        bufferRef.current = { chars: [], times: [] };
      }
      bufferRef.current.chars.push(e.key);
      bufferRef.current.times.push(now);
    }
  }, [enabled, minLength, maxAvgInterval, onScan]);

  useEffect(() => {
    if (!enabled) return undefined;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export default useBarcodeScanner;
