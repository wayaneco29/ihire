"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

type Props = {
  isFirstStep: boolean;
  isSaving?: boolean;
  isSubmitting: boolean;
  onBack: () => void | Promise<void>;
  submitDisabled?: boolean;
  status?: string;
  submitLabel?: string;
  submitMessage?: string | null;
  leading?: ReactNode;
};

export function PdsStepFooter({
  isFirstStep,
  isSaving = false,
  isSubmitting,
  onBack,
  submitDisabled = false,
  status,
  submitLabel = "Save and continue",
  submitMessage,
  leading,
}: Props) {
  const [isGoingBack, setIsGoingBack] = useState(false);

  async function handleBack() {
    setIsGoingBack(true);
    try {
      await onBack();
    } finally {
      setIsGoingBack(false);
    }
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 mt-0 border-t border-line bg-panel/95 shadow-card backdrop-blur lg:left-sidebar">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {leading}
          {status && (
            <p
              aria-live="polite"
              className="shrink-0 text-xs text-muted sm:text-sm"
            >
              {status}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {submitMessage && (
            <p className="mr-auto text-sm text-danger sm:mr-2" role="alert">
              {submitMessage}
            </p>
          )}
          {!isFirstStep && (
            <Button
              disabled={isSubmitting || isSaving || isGoingBack}
              loading={isGoingBack}
              onClick={handleBack}
              variant="ghost"
            >
              Back
            </Button>
          )}
          <Button
            disabled={isSubmitting || submitDisabled}
            type="submit"
            loading={isSubmitting}
            variant="filled"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </footer>
  );
}
