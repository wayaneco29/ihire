"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { createPdsUpdateDraft } from "../actions/versioning";

export function StartPdsUpdateButton({
  redirectToPds = false,
  className = "mt-4",
}: {
  redirectToPds?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function startUpdate() {
    setMessage(null);
    startTransition(async () => {
      const result = await createPdsUpdateDraft();
      if (result.success) {
        if (redirectToPds) router.push("/applicant/pds");
        else router.refresh();
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className={className}>
      <Button
        loading={isPending}
        onClick={startUpdate}
        variant="filled"
        className="text-sm! px-6! min-h-11"
      >
        Update PDS
      </Button>
      {message && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
