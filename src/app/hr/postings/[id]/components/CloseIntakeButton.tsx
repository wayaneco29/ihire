"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, message, Modal } from "antd";
import { Button } from "@/components/ui/Button";
import { closePostingIntake } from "../actions";

export function CloseIntakeButton({ jobId }: Readonly<{ jobId: string }>) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeIntake() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await closePostingIntake(jobId);
        if (result.success) {
          setOpen(false);
          messageApi.success(result.message);
          router.refresh();
        } else {
          setError(result.message);
        }
      } catch {
        setError("The posting could not be closed. Please try again.");
      }
    });
  }

  return (
    <>
      {contextHolder}
      <Button disabled={pending} onClick={() => { setError(null); setOpen(true); }} variant="bordered">
        Close intake
      </Button>
      <Modal
        open={open}
        onCancel={() => { if (!pending) setOpen(false); }}
        closable={!pending}
        maskClosable={!pending}
        keyboard={!pending}
        footer={null}
        title="Close application intake?"
      >
        <p className="text-sm leading-6 text-muted">Applicants will no longer be able to submit new applications. Existing applications can still be reviewed.</p>
        {error && <Alert className="mt-4" type="error" showIcon message={error} />}
        <div className="mt-5 flex justify-end gap-3">
          <Button disabled={pending} onClick={() => setOpen(false)} variant="bordered">Keep open</Button>
          <Button disabled={pending} loading={pending} onClick={closeIntake} variant="filled">Confirm close intake</Button>
        </div>
      </Modal>
    </>
  );
}
