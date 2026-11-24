"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "antd";
import { CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { FormCheckbox } from "@/components/form";
import { Button } from "@/components/ui/Button";
import type { Json } from "@/types/database";
import {
  asRecord,
  hasContent,
  PersonalInformationSummary,
  readableLabel,
  readableValue,
  SummaryObject,
} from "../PdsSummaryFields";
import { submitPdsVersion } from "../../actions/steps-ten-eleven";
import { pdsStepElevenSchema, type PdsStepElevenValues } from "../../schema";
import { PdsStepFooter } from "../PdsStepFooter";

const SECTIONS = [
  "Personal information",
  "Family background",
  "Educational background",
  "Civil service eligibility",
  "Work experience",
  "Voluntary work",
  "Learning and development",
  "Other information",
  "Questionnaire",
  "References",
] as const;

type ReviewSection = {
  id: string;
  title: (typeof SECTIONS)[number];
  step: number;
};

type ReviewNotice = {
  id: string;
  step: number;
  text: string;
};

const REVIEW_SECTIONS: ReviewSection[] = SECTIONS.map((title, index) => ({
  id: "pds-review-section-" + (index + 1),
  title,
  step: index + 1,
}));

const STANDARD_EDUCATION_LEVELS = [
  ["ELEMENTARY", "Elementary"],
  ["SECONDARY", "High school"],
  ["VOCATIONAL_TRADE", "Vocational or trade"],
  ["COLLEGE", "College"],
] as const;

function countEmptyFields(value: Json | undefined): number {
  if (value == null) return 1;
  if (typeof value === "string") return value.trim() ? 0 : 1;
  if (typeof value === "number" || typeof value === "boolean") return 0;
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (count, entry) => count + countEmptyFields(entry),
      0,
    );
  }
  return Object.entries(value).reduce<number>(
    (count, [key, childValue]) =>
      ["id", "pds_version_id", "sort_order", "question_code"].includes(key)
        ? count
        : count + countEmptyFields(childValue),
    0,
  );
}

function sectionSummary(
  step: Record<string, Json | undefined>,
  stepNumber: number,
) {
  if (!hasContent(step)) return "None added";

  if (stepNumber === 1) {
    const personal = asRecord(step.personalInfo);
    const fullName = [
      personal.first_name,
      personal.middle_name,
      personal.surname,
    ]
      .filter(
        (name): name is string => typeof name === "string" && !!name.trim(),
      )
      .join(" ");
    const status =
      typeof personal.civil_status === "string" && personal.civil_status
        ? readableValue(personal.civil_status)
        : null;
    return [fullName, status, personal.email]
      .filter((item): item is string => typeof item === "string" && !!item)
      .join(" · ");
  }

  if (stepNumber === 3) {
    const rows = Array.isArray(step.education) ? step.education : [];
    const enteredRows = rows.filter((row) => hasContent(row));
    const levels = enteredRows.map((row) => {
      const level = asRecord(row).level;
      return typeof level === "string"
        ? readableValue(level)
        : "Education record";
    });
    const missingLevels = STANDARD_EDUCATION_LEVELS.filter(
      ([level]) => !enteredRows.some((row) => asRecord(row).level === level),
    ).length;
    return [
      levels.join(", "),
      missingLevels ? `${missingLevels} standard levels empty` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (stepNumber === 2) {
    const family = asRecord(step.familyBackground);
    const spouseName = [family.spouse_first_name, family.spouse_surname]
      .filter(
        (name): name is string => typeof name === "string" && !!name.trim(),
      )
      .join(" ");
    const children = Array.isArray(step.children)
      ? step.children.filter((child) => hasContent(child)).length
      : 0;
    return [
      spouseName ? "Spouse listed" : null,
      `${children} ${children === 1 ? "child" : "children"}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (stepNumber === 9) {
    const rows = Array.isArray(step.questionnaire) ? step.questionnaire : [];
    const answered = rows.filter((row) => asRecord(row).answer != null).length;
    const yes = rows.filter((row) => asRecord(row).answer === true).length;
    return `${answered} of ${rows.length} answered${
      answered ? ` · ${yes} Yes` : ""
    }`;
  }

  if (stepNumber === 10) {
    const rows = Array.isArray(step.references) ? step.references : [];
    const count = rows.filter((row) => hasContent(row)).length;
    return `${count} ${count === 1 ? "reference" : "references"}`;
  }

  const collection = Object.values(step).find(Array.isArray);
  if (Array.isArray(collection)) {
    const count = collection.filter((row) => hasContent(row)).length;
    return `${count} ${count === 1 ? "record" : "records"} added`;
  }

  return "Information added";
}

function getReviewNotices(
  steps: Record<string, Json | undefined>,
): ReviewNotice[] {
  const notices: ReviewNotice[] = [];
  const personal = asRecord(asRecord(steps["1"]).personalInfo);
  if (
    hasContent(personal) &&
    !hasContent(personal.mobile_no) &&
    !hasContent(personal.telephone_no)
  ) {
    notices.push({
      id: "missing-phone",
      step: 1,
      text: "No contact number is listed in your personal information.",
    });
  }

  const education = asRecord(steps["3"]);
  const educationRows = Array.isArray(education.education)
    ? education.education
    : [];
  const missingEducation = STANDARD_EDUCATION_LEVELS.filter(
    ([level]) =>
      !educationRows.some(
        (row) =>
          asRecord(row).level === level &&
          hasContent(asRecord(row).school_name),
      ),
  ).map(([, label]) => label);
  if (missingEducation.length > 0) {
    notices.push({
      id: "education-levels",
      step: 3,
      text: `${missingEducation.join(", ")} ${
        missingEducation.length === 1 ? "has" : "have"
      } no school listed. Skip any level you did not attend.`,
    });
  }

  const references = asRecord(steps["10"]);
  const referenceRows = Array.isArray(references.references)
    ? references.references
    : [];
  if (
    referenceRows.some(
      (row) => hasContent(row) && !hasContent(asRecord(row).contact),
    )
  ) {
    notices.push({
      id: "missing-reference-contact",
      step: 10,
      text: "One or more references have no contact information.",
    });
  }

  return notices;
}

export function ReviewSubmitStep({
  draftData,
  onBack,
  onEditSection,
  onSubmitted,
  pdsVersionId,
}: {
  draftData: Json;
  onBack: () => void;
  onEditSection: (step: number) => void;
  onSubmitted: () => void;
  pdsVersionId: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set([1]),
  );
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit } = useForm<PdsStepElevenValues>({
    defaultValues: { confirm_reviewed: false },
    resolver: yupResolver(pdsStepElevenSchema) as Resolver<PdsStepElevenValues>,
  });
  const confirmed = useWatch({ control, name: "confirm_reviewed" });
  const steps = asRecord(draftData);
  const filledCount = REVIEW_SECTIONS.filter((section) =>
    hasContent(asRecord(steps[String(section.step)])),
  ).length;
  const emptyCount = REVIEW_SECTIONS.length - filledCount;
  const notices = getReviewNotices(steps);

  function toggleSection(step: number) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  }

  function toggleAllSections() {
    setOpenSections((current) =>
      current.size === REVIEW_SECTIONS.length
        ? new Set()
        : new Set(REVIEW_SECTIONS.map(({ step }) => step)),
    );
  }

  function reviewSection(step: number) {
    setOpenSections((current) => new Set(current).add(step));
    document
      .getElementById(`pds-review-section-${step}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    <form className="pb-28" onSubmit={handleSubmit(submit)}>
      <div className="min-w-0">
        <div className="my-5 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-line bg-panel px-4 py-3.5 text-sm">
          <span>
            <strong className="mr-1.5 text-lg text-ink">
              {SECTIONS.length}
            </strong>
            sections
          </span>
          <span>
            <strong className="mr-1.5 text-lg text-ink">{filledCount}</strong>
            filled in
          </span>
          <span>
            <strong className="mr-1.5 text-lg text-ink">{emptyCount}</strong>
            left empty
          </span>
          <span>
            <strong className="mr-1.5 text-lg text-ink">
              {notices.length}
            </strong>
            worth a second look
          </span>
        </div>

        <section
          aria-labelledby="pds-second-look-heading"
          className="mb-6 rounded-lg border border-dashed border-warning bg-warning/10 p-4 sm:p-5"
        >
          <h3
            className="text-base font-semibold text-warning"
            id="pds-second-look-heading"
          >
            Worth a second look
          </h3>
          <p className="mt-1 text-xs leading-5 text-warning">
            These suggestions won’t stop you from submitting.
          </p>
          {notices.length ? (
            <ul className="mt-3 divide-y divide-warning/20">
              {notices.map((notice) => (
                <li
                  className="flex items-center justify-between gap-3 py-2.5 text-sm text-ink"
                  key={notice.id}
                >
                  <span>{notice.text}</span>
                  <Button
                    className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    onClick={() => reviewSection(notice.step)}
                    type="button"
                    variant="unstyled"
                  >
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
              <CheckCircleIcon
                aria-hidden="true"
                className="size-5 text-primary"
              />
              Nothing needs a second look.
            </p>
          )}
        </section>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            checked={showEmpty}
            onChange={(event) => setShowEmpty(event.target.checked)}
          >
            Show fields I left blank
          </Checkbox>
          <Button
            className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={toggleAllSections}
            type="button"
            variant="unstyled"
          >
            {openSections.size === REVIEW_SECTIONS.length
              ? "Collapse all"
              : "Expand all"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {REVIEW_SECTIONS.map(({ id, step, title }) => {
            const section = asRecord(steps[String(step)]);
            const filled = hasContent(section);
            const open = openSections.has(step);
            const emptyFields = countEmptyFields(section);
            const stateLabel = filled
              ? notices.some((notice) => notice.step === step)
                ? "Needs a look"
                : "Complete"
              : "None added";
            const stateClass = filled
              ? notices.some((notice) => notice.step === step)
                ? "border-warning/20 bg-warning/10 text-warning"
                : "border-primary/15 bg-primary-light text-primary-dark"
              : "border-line bg-panel-muted text-muted";

            return (
              <section
                className="border-t border-line first:border-t-0"
                id={id}
                key={id}
              >
                <Button
                  aria-controls={`${id}-body`}
                  aria-expanded={open}
                  className="flex w-full items-center cursor-pointer gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:px-5"
                  onClick={() => toggleSection(step)}
                  type="button"
                  variant="unstyled"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold sm:text-lg text-primary! font-bricolage!">
                      {title}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      {sectionSummary(section, step)}
                    </span>
                  </span>
                  <span
                    className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold sm:inline-flex ${stateClass}`}
                  >
                    {stateLabel}
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className={`size-4 shrink-0 text-muted transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {open && (
                  <div
                    className="px-4 pb-4 pl-4 sm:px-5 sm:pb-5"
                    id={`${id}-body`}
                  >
                    {filled ? (
                      step === 1 ? (
                        <PersonalInformationSummary
                          showEmpty={showEmpty}
                          value={section}
                        />
                      ) : (
                        <SummaryObject showEmpty={showEmpty} value={section} />
                      )
                    ) : (
                      <p className="text-sm leading-6 text-muted">
                        You haven’t added anything here. This section will
                        appear empty in your PDS.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-3">
                      <p className="text-xs text-muted">
                        {!showEmpty && emptyFields > 0
                          ? `${emptyFields} blank ${
                              emptyFields === 1 ? "field" : "fields"
                            } hidden`
                          : ""}
                      </p>
                      <Button
                        className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        onClick={() => onEditSection(step)}
                        type="button"
                        variant="unstyled"
                      >
                        Edit {title.toLowerCase()}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <PdsStepFooter
        isFirstStep={false}
        isSubmitting={isPending}
        onBack={onBack}
        leading={
          <div className="min-w-0 flex-1 [&>div]:mb-0">
            <FormCheckbox
              control={control}
              label="I’ve reviewed this PDS and want to submit it as final."
              name="confirm_reviewed"
              required
            />
          </div>
        }
        status=""
        submitDisabled={!confirmed}
        submitLabel="Submit PDS"
        submitMessage={message}
      />
    </form>
  );
}
