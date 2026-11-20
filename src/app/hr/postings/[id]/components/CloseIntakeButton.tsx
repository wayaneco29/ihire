"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { message, Popconfirm } from "antd";
import { Button } from "@/components/ui/Button";
import { closePostingIntake } from "../actions";

export function CloseIntakeButton({ jobId }: Readonly<{ jobId: string }>) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [pending, startTransition] = useTransition();

  function closeIntake() {
    startTransition(async () => {
      const result = await closePostingIntake(jobId);
      if (result.success) {
        messageApi.success(result.message);
        router.refresh();
      } else {
        messageApi.error(result.message);
      }
    });
  }

  return (
    <>
      {contextHolder}
      <Popconfirm
        cancelText="Keep open"
        description="Applicants will no longer be able to submit new applications. Existing applications can still be reviewed."
        okText="Close intake"
        onConfirm={closeIntake}
        title="Close application intake?"
      >
        <Button disabled={pending} loading={pending} variant="bordered">
          Close intake
        </Button>
      </Popconfirm>
    </>
  );
}
