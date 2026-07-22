import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

const STORAGE_KEY = "pb-install-dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const inStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    if (inStandalone) return; // already installed
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    setIsIOS(iOS);
    if (iOS) {
      // iOS doesn't fire beforeinstallprompt — show manual hint
      setTimeout(() => setVisible(true), 2500);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setVisible(false);
      setDeferred(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (isIOS) {
      setShowIosHelp(true);
      return;
    }
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 bg-white border border-[#E7E5DF] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-4 soft-rise"
    >
      <button
        onClick={dismiss}
        data-testid="pwa-install-dismiss"
        className="absolute top-2 right-2 p-1 rounded-md text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F2F0EA]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {!showIosHelp ? (
        <>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2A4F4F] flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-semibold text-[#1C1917] text-sm">
                PaisaBook ko app ki tarah install karo
              </div>
              <div className="text-xs text-[#57534E] mt-0.5">
                Home screen pe icon, full-screen, tez access — bilkul app jaisa feel.
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={install}
              data-testid="pwa-install-btn"
              className="flex-1 bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-9 text-sm"
            >
              <Download className="w-4 h-4 mr-1" /> Install karo
            </Button>
            <Button
              variant="outline"
              onClick={dismiss}
              data-testid="pwa-install-later"
              className="border-[#E7E5DF] text-[#57534E] hover:bg-[#F2F0EA] rounded-full h-9 text-sm"
            >
              Baad mein
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="font-heading font-semibold text-[#1C1917] text-sm">
            iOS pe install kaise karein
          </div>
          <ol className="mt-2 text-xs text-[#57534E] space-y-1.5 list-decimal list-inside">
            <li>Safari mein neeche <b>Share</b> button dabao</li>
            <li>Scroll karo, <b>"Add to Home Screen"</b> chuno</li>
            <li>Right upar <b>Add</b> dabao — ho gaya!</li>
          </ol>
          <Button
            onClick={dismiss}
            data-testid="pwa-install-ios-done"
            className="w-full mt-3 bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-9 text-sm"
          >
            Samajh gaya
          </Button>
        </>
      )}
    </div>
  );
}
