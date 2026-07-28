import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { usePremium } from "@/context/PremiumContext";

export default function LockedFeatureDialog() {
  const { lockedFeature, closeLocked } = usePremium();
  const nav = useNavigate();

  return (
    <Dialog open={!!lockedFeature} onOpenChange={(open) => !open && closeLocked()}>
      <DialogContent className="max-w-sm text-center" data-testid="locked-feature-dialog">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-[#D96C52]/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-[#D96C52]" />
          </div>
          <DialogTitle className="text-center">🔒 Premium Feature</DialogTitle>
          <DialogDescription className="text-center">
            This feature is available only for Premium Members.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            data-testid="locked-feature-upgrade-btn"
            onClick={() => { closeLocked(); nav("/premium"); }}
            className="w-full bg-[#D96C52] hover:bg-[#c25a41] text-white rounded-full"
          >
            Upgrade
          </Button>
          <Button
            variant="outline"
            data-testid="locked-feature-cancel-btn"
            onClick={closeLocked}
            className="w-full rounded-full border-[#E7E5DF]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
