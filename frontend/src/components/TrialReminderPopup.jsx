import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/context/PremiumContext";

export default function TrialReminderPopup() {
  const { showReminder, dismissReminder, status } = usePremium();
  const nav = useNavigate();

  if (!status) return null;

  return (
    <Dialog open={showReminder} onOpenChange={(open) => !open && dismissReminder()}>
      <DialogContent className="max-w-sm text-center" data-testid="trial-reminder-dialog">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">🎉 Your Premium Trial Ends Soon</DialogTitle>
          <DialogDescription className="text-center">
            Enjoy unlimited AI, reports, cloud backup and an ad-free experience by upgrading to Premium.
            {typeof status.trial_days_left === "number" && (
              <div className="mt-2 text-xs text-[#78716C]">
                {status.trial_days_left} day{status.trial_days_left === 1 ? "" : "s"} left in your trial.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            data-testid="trial-reminder-upgrade-btn"
            onClick={() => { dismissReminder(); nav("/premium"); }}
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full"
          >
            Upgrade Now
          </Button>
          <Button
            variant="outline"
            data-testid="trial-reminder-later-btn"
            onClick={dismissReminder}
            className="w-full rounded-full border-[#E7E5DF]"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
