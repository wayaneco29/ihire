"use client";

import { useState, useTransition } from "react";
import { Button } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormCheckbox } from "@/components/form";
import type { Json } from "@/types/database";
import { COUNTRY_OPTIONS } from "@/constants/pds-options";
import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import { formatDate } from "@/utils/format-date";
import { submitPdsVersion } from "../../actions/steps-ten-eleven";
import { pdsStepElevenSchema, type PdsStepElevenValues } from "../../schema";

const SECTIONS = [
  "Personal Information",
  "Family Background",
  "Educational Background",
  "Civil Service Eligibility",
  "Work Experience",
  "Voluntary Work",
  "Learning & Development",
  "Other Information",
  "Questionnaire",
  "References",
] as const;

const FIELD_LABELS: Record<string, string> = {
  date_of_birth: "Date of birth",
  date_from: "From",
  date_to: "To",
  date_filed: "Date filed",
  sameAsResidential: "Same as residential address",
  is_gov_service: "Government service",
  ld_type: "Type",
  id_no: "ID number",
  sort_order: "Order",
};

type Props = {
  draftData: Json;
  onSubmitted: () => void;
  pdsVersionId: string;
};

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function readableLabel(value: string) {
  return (
    FIELD_LABELS[value] ??
    value
      .replaceAll("_", " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function readableValue(value: string) {
  const country = COUNTRY_OPTIONS.find((option) => option.value === value);
  if (country) return country.label;
  if (/^[A-Z][A-Z_]+$/.test(value)) {
    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return value;
}

function SummaryValue({ value }: { value: Json | undefined }) {
  if (value === null || value === "") {
    return <span className="text-muted">Not provided</span>;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    return readableValue(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-muted">None recorded</span>;
    return (
      <div className="space-y-3">
        {value.map((entry, index) => (
          <div
            className="rounded-lg border border-line bg-panel p-3"
            key={index}
          >
            {entry && typeof entry === "object" && !Array.isArray(entry) ? (
              <>
                {typeof entry.question_code === "string" && (
                  <p className="mb-2 text-sm font-semibold text-primary">
                    {typeof entry.question_code === "string" && (
                      <>
                        {entry.question_code}:{" "}
                        {
                          PDS_QUESTIONNAIRE_ITEMS.find(
                            (item) => item.code === entry.question_code,
                          )?.question
                        }
                      </>
                    )}
                  </p>
                )}
                <SummaryObject value={entry} />
              </>
            ) : (
              <SummaryValue value={entry} />
            )}
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return <SummaryObject value={value as Record<string, Json | undefined>} />;
  }
  return <span className="text-muted">Not provided</span>;
}

function SummaryObject({ value }: { value: Record<string, Json | undefined> }) {
  const entries = Object.entries(value).filter(
    ([key]) =>
      !["id", "pds_version_id", "sort_order", "question_code"].includes(key),
  );
  if (entries.length === 0)
    return <span className="text-muted">Not provided</span>;

  return (
    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div className="min-w-0" key={key}>
          <dt className="text-xs font-medium text-muted">
            {readableLabel(key)}
          </dt>
          <dd className="mt-1 break-words text-sm text-ink">
            <SummaryValue value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewSubmitStep({
  draftData,
  onSubmitted,
  pdsVersionId,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit } = useForm<PdsStepElevenValues>({
    defaultValues: { confirm_reviewed: false },
    resolver: yupResolver(pdsStepElevenSchema) as Resolver<PdsStepElevenValues>,
  });
  const steps = asRecord(draftData);

  function submit(values: PdsStepElevenValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitPdsVersion(pdsVersionId, values);
      if (result.success) {
        onSubmitted();
      } else {
        setMessage(result.message ?? "Your PDS could not be submitted.");
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)}>
      <div>
        <h3 className="text-base font-semibold text-ink">Review and submit</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Review your answers below. Use the stepper to return to any completed
          section before submitting.
        </p>
      </div>

      {SECTIONS.map((title, index) => {
        const step = asRecord(steps[String(index + 1)] ?? null);
        return (
          <section
            className="rounded-md border border-line bg-panel-muted p-4 sm:p-5"
            key={title}
          >
            <h4 className="mb-4 text-sm font-semibold text-ink">
              {index + 1}. {title}
            </h4>
            <SummaryObject value={step} />
          </section>
        );
      })}

      <FormCheckbox
        control={control}
        label="I have reviewed this PDS summary and want to submit it."
        name="confirm_reviewed"
        required
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        {message ? (
          <p aria-live="polite" className="text-sm text-danger" role="alert">
            {message}
          </p>
        ) : (
          <p className="text-sm text-muted">
            Submitting marks this PDS version as final for review.
          </p>
        )}
        <Button htmlType="submit" loading={isPending} type="primary">
          Submit PDS
        </Button>
      </div>
    </form>
  );
}
