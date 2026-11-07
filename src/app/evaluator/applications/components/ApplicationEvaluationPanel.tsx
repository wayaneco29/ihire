"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormSelect } from "@/components/form/FormSelect";
import { FormTextArea } from "@/components/form/FormTextArea";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { submitApplicationEvaluation } from "../actions";
import { applicationEvaluationSchema, type ApplicationEvaluationValues } from "../schema";

const evaluationOptions = [
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Not qualified", value: "NOT_QUALIFIED" },
];

export function ApplicationEvaluationPanel({
  applicationId,
  applicationStatus,
  previousEvaluation,
}: {
  applicationId: string;
  applicationStatus: string;
  previousEvaluation: { result: string; remarks: string | null; evaluated_at: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ApplicationEvaluationValues>({
    resolver: yupResolver(applicationEvaluationSchema),
    defaultValues: { remarks: "" },
  });

  function submit(values: ApplicationEvaluationValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitApplicationEvaluation({
        applicationId,
        result: values.result,
        remarks: values.remarks,
      });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  const isFinal = applicationStatus === "HIRED" || applicationStatus === "REJECTED";

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Application evaluation</h2>
          <p className="mt-1 text-sm text-muted">Required document types must be verified before you submit an assessment.</p>
        </div>
        {previousEvaluation && <WorkflowStatusTag status={previousEvaluation.result} />}
      </div>

      {previousEvaluation && (
        <div className="mt-4 rounded-xl bg-panel-muted p-4">
          <p className="text-xs text-muted">Your latest evaluation · {formatDate(previousEvaluation.evaluated_at, "MMM D, YYYY · h:mm A")}</p>
          {previousEvaluation.remarks && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{previousEvaluation.remarks}</p>}
        </div>
      )}

      {isFinal ? (
        <p className="mt-4 text-sm text-muted">The application has a final hiring decision and can no longer be evaluated.</p>
      ) : (
        <form className="mt-5 space-y-4 border-t border-line-subtle pt-5" onSubmit={form.handleSubmit(submit)}>
          <FormSelect
            control={form.control}
            label="Assessment result"
            name="result"
            options={evaluationOptions}
            placeholder="Choose a result"
            required
          />
          <FormTextArea
            control={form.control}
            label="Evaluation remarks"
            maxLength={2000}
            name="remarks"
            placeholder="Add a concise explanation for your assessment."
            rows={4}
            showCount
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving assessment…" : "Save assessment"}
          </button>
          {message && <p className={`text-sm ${message === "Application evaluation saved." ? "text-primary" : "text-danger"}`} role="status">{message}</p>}
        </form>
      )}
    </section>
  );
}
