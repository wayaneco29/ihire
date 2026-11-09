"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyToJob } from "../../actions";

export function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    startTransition(async () => {
      const result = await applyToJob(jobId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/applicant/applications/${result.applicationId}`);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={pending}
        onClick={apply}
        type="button"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
