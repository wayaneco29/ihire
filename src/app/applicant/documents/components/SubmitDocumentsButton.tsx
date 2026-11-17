"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "antd";
import { Button } from "@/components/ui/Button";
import { submitApplicantDocumentsForReview } from "../actions";

export function SubmitDocumentsButton({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitApplicantDocumentsForReview();
      setMessage(result.message);
      setIsError(!result.success);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-primary/20 bg-primary-light/40 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">
          Ready to submit your documents?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Submit all {pendingCount} uploaded document
          {pendingCount === 1 ? "" : "s"} to the Document Reviewer. They will
          remain editable until verified.
        </p>
        {message && (
          <Alert
            className="mt-3"
            message={message}
            showIcon
            type={isError ? "error" : "success"}
          />
        )}
      </div>
      <Button
        className="mt-3 shrink-0 sm:mt-0"
        disabled={pending}
        loading={pending}
        onClick={submit}
        type="button"
        variant="filled"
      >
        {pending ? "Submitting…" : "Submit all for review"}
      </Button>
    </div>
  );
}
