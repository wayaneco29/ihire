"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { message, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormTextArea } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { hireApplicant } from "../actions";
import * as yup from "yup";
import { SpecialOrderModal } from "./SpecialOrderModal";

const remarksSchema = yup.object({
  remarks: yup
    .string()
    .trim()
    .min(1, "Hiring remarks are required.")
    .max(2000, "Keep remarks under 2,000 characters.")
    .required("Hiring remarks are required."),
});

export function HiringRemarksForm({
  applicationId,
  applicantName,
  positionTitle,
  hired = false,
}: Readonly<{
  applicationId: string;
  applicantName: string;
  positionTitle: string;
  hired?: boolean;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [hireCompleted, setHireCompleted] = useState(false);
  const form = useForm<{ remarks: string }>({
    resolver: yupResolver(remarksSchema),
    defaultValues: { remarks: "" },
    mode: "onChange",
  });

  function submit(values: { remarks: string }) {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await hireApplicant(applicationId, values.remarks);
        if (!result.success) {
          messageApi.error({ content: result.message, duration: 8 });
          return;
        }
        messageApi.success(result.message);
        setHireCompleted(true);
        setConfirmOpen(false);
        setOrderOpen(true);
        router.refresh();
      } catch {
        messageApi.error("Unable to confirm the hiring result. Refresh to check the applicant's status before trying again.");
      }
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-panel p-5 sm:p-6">
      {contextHolder}
      <h2 className="font-semibold text-ink">SDS hiring decision</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Only the School Division Superintendent can hire a qualified applicant.
        Add remarks to record the decision.
      </p>
      {hired || hireCompleted ? (
        <Button
          className="mt-4"
          onClick={() => setOrderOpen(true)}
          variant="filled"
        >
          Prepare Special Order
        </Button>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit(() => setConfirmOpen(true))}
        >
          <FormTextArea
            control={form.control}
            label="Required hiring remarks"
            name="remarks"
            required
            maxLength={2000}
            rows={4}
            showCount
            placeholder="Explain the hiring decision."
          />
          <Button
            disabled={pending || !form.formState.isValid}
            loading={pending}
            type="submit"
            variant="filled"
          >
            Hire applicant
          </Button>
        </form>
      )}
      <Modal
        open={confirmOpen}
        title={`Hire ${applicantName}?`}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        closable={!pending}
        maskClosable={!pending}
        footer={null}
      >
        <p className="text-sm text-muted">
          Confirming records the final hiring decision and uses one available
          slot. You can then prepare the applicant’s Special Order.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            disabled={pending}
            onClick={() => setConfirmOpen(false)}
            variant="bordered"
          >
            Cancel
          </Button>
          <Button
            disabled={pending}
            loading={pending}
            onClick={form.handleSubmit(submit)}
            variant="filled"
          >
            Confirm hire
          </Button>
        </div>
      </Modal>
      <SpecialOrderModal
        applicationId={applicationId}
        applicantName={applicantName}
        positionTitle={positionTitle}
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
      />
    </section>
  );
}
