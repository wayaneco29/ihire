"use client";

import { useState, useTransition } from "react";
import { Button } from "antd";
import {
  CheckCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
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
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div
            className="rounded-lg border border-line-subtle bg-panel-muted/50 p-3"
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
    <form className="space-y-6" onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-4 rounded-xl border border-primary/15 bg-primary-light/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3.5">
          <CheckCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-primary"
          />
          <div>
            <p className="text-sm font-semibold text-primary-dark">
              Final review
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Review your PDS
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Check each section before submitting. Use the stepper above to
              make changes to a completed section.
            </p>
          </div>
        </div>
        <span className="ml-9 w-fit rounded-full border border-primary/20 bg-panel/80 px-3 py-1 text-xs font-semibold text-primary-dark sm:ml-0">
          {SECTIONS.length} sections
        </span>
      </div>

      <section
        aria-labelledby="pds-review-sections-heading"
        className="overflow-hidden rounded-xl border border-line bg-panel"
      >
        <div className="border-b border-line-subtle bg-panel-muted/70 px-4 py-3.5 sm:px-5">
          <h4
            className="text-sm font-semibold text-ink"
            id="pds-review-sections-heading"
          >
            Sections to review
          </h4>
          <p className="mt-1 text-xs leading-5 text-muted">
            Open a section to check the information you provided.
          </p>
        </div>
        <div className="divide-y divide-line-subtle px-4 sm:px-5">
          {SECTIONS.map((title, index) => {
            const step = asRecord(steps[String(index + 1)] ?? null);
            return (
              <details
                className="group py-1"
                key={title}
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg py-3 text-left outline-none transition-colors hover:bg-panel-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-light text-xs font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                    {title}
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="pb-4 pl-11 pr-2 pt-1 sm:pl-12">
                  <SummaryObject value={step} />
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="pds-submit-confirmation-heading"
        className="rounded-xl border border-line bg-panel-muted/70 p-4 sm:p-5"
      >
        <h4
          className="text-sm font-semibold text-ink"
          id="pds-submit-confirmation-heading"
        >
          Confirm submission
        </h4>
        <p className="mt-1 text-sm leading-6 text-muted">
          Submitting marks this PDS version as final for review.
        </p>
        <div className="mt-4">
          <FormCheckbox
            control={control}
            label="I have reviewed this PDS summary and want to submit it."
            name="confirm_reviewed"
            required
          />
        </div>
        {message && (
          <p
            aria-live="polite"
            className="mb-4 text-sm text-danger"
            role="alert"
          >
            {message}
          </p>
        )}
        <div className="flex justify-end border-t border-line pt-4">
          <Button
            className="sm:min-w-36"
            htmlType="submit"
            loading={isPending}
            type="primary"
          >
            Submit PDS
          </Button>
        </div>
      </section>
    </form>
  );
}
