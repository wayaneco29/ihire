"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Popconfirm } from "antd";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormTextArea } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { hireApplicant } from "../actions";
import * as yup from "yup";

const remarksSchema = yup.object({
  remarks: yup.string().trim().min(1, "Hiring remarks are required.").max(2000, "Keep remarks under 2,000 characters.").required("Hiring remarks are required."),
});

export function HiringRemarksForm({ applicationId, applicantName }: Readonly<{ applicationId: string; applicantName: string }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const form = useForm<{ remarks: string }>({ resolver: yupResolver(remarksSchema), defaultValues: { remarks: "" }, mode: "onChange" });

  function submit(values: { remarks: string }) {
    setFeedback(null);
    startTransition(async () => {
      const result = await hireApplicant(applicationId, values.remarks);
      setFeedback(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-semibold text-ink">SDS hiring decision</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Only the School Division Superintendent can hire a qualified applicant. Add remarks to record the decision.</p>
      {feedback && <Alert className="mt-4" message={feedback.message} showIcon type={feedback.success ? "success" : "error"} />}
      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(submit)}>
        <FormTextArea control={form.control} label="Required hiring remarks" name="remarks" required maxLength={2000} rows={4} showCount placeholder="Explain the hiring decision." />
        <Popconfirm title={`Hire ${applicantName}?`} description="This records the final hiring decision and uses one slot." okText="Confirm hire" cancelText="Cancel" onConfirm={form.handleSubmit(submit)}>
          <Button disabled={pending || !form.formState.isValid} loading={pending} type="button" variant="filled">Hire applicant</Button>
        </Popconfirm>
      </form>
    </section>
  );
}
