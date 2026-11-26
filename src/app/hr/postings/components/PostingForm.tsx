"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert } from "antd";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import {
  FormCheckboxGroup,
  FormDatePicker,
  FormInput,
  FormSelect,
  FormTextArea,
} from "@/components/form";
import { Button } from "@/components/ui/Button";
import { createJobPosting, updateJobPosting } from "../actions";
import { HIRING_TRACKS, postingSchema, type PostingValues } from "../schema";
import dayjs from "dayjs";
import { ScoringProfileEditor } from "@/components/scoring/ScoringProfileEditor";
import type { ScoringRule } from "@/types/scoring";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  getJobRequirementsPdfPath,
  JOB_REQUIREMENTS_BUCKET,
} from "@/utils/job-requirements";
import { RequirementsEditor } from "./RequirementsEditor";

type PositionOption = {
  id: string;
  title: string;
  track: string;
  is_active: boolean;
  scoringProfileId: string;
  scoringProfileVersion: number;
  scoringRules: ScoringRule[];
};

type Values = PostingValues;

type PostingSeed = Values & {
  id: string;
  scoringLockedAt: string | null;
  requirementsPdfUrl: string | null;
};

const positionOptionClasses = [
  "md:grid-cols-3",
  "[&_.ant-checkbox-wrapper]:m-0!",
  "[&_.ant-checkbox-wrapper]:w-fit",
  "[&_.ant-checkbox-wrapper]:rounded-full",
  "[&_.ant-checkbox-wrapper]:border",
  "[&_.ant-checkbox-wrapper]:border-line",
  "[&_.ant-checkbox-wrapper]:bg-panel",
  "[&_.ant-checkbox-wrapper]:px-3",
  "[&_.ant-checkbox-wrapper]:py-2",
  "[&_.ant-checkbox-wrapper]:text-sm",
  "[&_.ant-checkbox-wrapper]:text-ink",
  "[&_.ant-checkbox-wrapper:hover]:border-primary",
  "[&_.ant-checkbox-wrapper-checked]:border-primary",
  "[&_.ant-checkbox-wrapper-checked]:bg-primary-light",
  "[&_.ant-checkbox-wrapper-checked]:text-primary",
].join(" ");

export function PostingForm({
  posting,
  positions,
}: Readonly<{ posting?: PostingSeed; positions: PositionOption[] }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPostingId, setSavedPostingId] = useState<string | null>(
    posting?.id ?? null,
  );
  const [requirementsPdf, setRequirementsPdf] = useState<File | null>(null);
  const [removeRequirementsPdf, setRemoveRequirementsPdf] = useState(false);
  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<Values>({
    mode: "onChange",
    resolver: yupResolver(postingSchema) as Resolver<Values>,
    defaultValues: posting
      ? {
          title: posting.title,
          description: posting.description,
          requirements: posting.requirements.length ? posting.requirements : [""],
          slots: posting.slots,
          deadline: "",
          status: posting.status,
          hiringTrack: posting.hiringTrack,
          positionIds: posting.positionIds,
          scoring: posting.scoring,
          minimumScores: posting.minimumScores,
        }
      : {
          title: "",
          description: "",
          requirements: [""],
          slots: 1,
          deadline: "",
          status: "DRAFT",
          positionIds: [],
          scoring: [],
          minimumScores: [],
        },
  });
  const hiringTrack = useWatch({ control, name: "hiringTrack" });
  const postingStatus = useWatch({ control, name: "status" });
  const selectedPositionIds = useWatch({ control, name: "positionIds" }) ?? [];
  const scoring = useWatch({ control, name: "scoring" }) ?? [];
  const minimumScores = useWatch({ control, name: "minimumScores" }) ?? [];

  useEffect(() => {
    const byPosition = new Map(minimumScores.map((entry) => [entry.position_id, entry.minimum_total_points]));
    const normalized = selectedPositionIds.map((positionId) => ({
      position_id: positionId,
      minimum_total_points: byPosition.get(positionId) ?? null,
    }));
    if (normalized.length !== minimumScores.length || normalized.some((entry, index) =>
      entry.position_id !== minimumScores[index]?.position_id ||
      entry.minimum_total_points !== minimumScores[index]?.minimum_total_points
    )) {
      setValue("minimumScores", normalized, { shouldDirty: true, shouldValidate: true });
    }
  }, [minimumScores, selectedPositionIds, setValue]);

  useEffect(() => {
    if (!posting?.deadline) return;
    const date = new Date(posting.deadline);
    if (!Number.isFinite(date.getTime())) return;
    const localValue = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);
    reset({
      ...posting,
      requirements: posting.requirements.length ? posting.requirements : [""],
      deadline: localValue,
    });
  }, [posting, reset]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    const payload = {
      ...values,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : "",
      scoring: values.positionIds.map((positionId) => ({
        position_id: positionId,
        rules: values.scoring.find((entry) => entry.position_id === positionId)?.rules ??
          positions.find((position) => position.id === positionId)?.scoringRules ?? [],
      })),
      minimumScores: values.positionIds.map((positionId) => ({
        position_id: positionId,
        minimum_total_points: values.minimumScores.find((entry) => entry.position_id === positionId)?.minimum_total_points ?? null,
      })),
    };
    const result = savedPostingId
      ? await updateJobPosting(savedPostingId, payload)
      : await createJobPosting(payload);
    if (!result.success) {
      setError(result.message);
      return;
    }

    const jobId = result.jobId ?? savedPostingId;
    if (!jobId) {
      setError("The posting was saved, but its ID could not be confirmed.");
      return;
    }
    setSavedPostingId(jobId);

    const supabase = createBrowserSupabaseClient();
    const pdfPath = getJobRequirementsPdfPath(jobId);
    if (requirementsPdf) {
      const { error: uploadError } = await supabase.storage
        .from(JOB_REQUIREMENTS_BUCKET)
        .upload(pdfPath, requirementsPdf, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) {
        setError(
          "The posting was saved, but its PDF could not be uploaded. Save again to retry the upload.",
        );
        return;
      }
    } else if (removeRequirementsPdf) {
      const { error: removeError } = await supabase.storage
        .from(JOB_REQUIREMENTS_BUCKET)
        .remove([pdfPath]);
      if (removeError) {
        setError(
          "The posting was saved, but its attached PDF could not be removed. Save again to retry.",
        );
        return;
      }
    }

    setMessage(result.message);
    router.refresh();
    router.push(posting ? `/hr/postings/${posting.id}` : "/hr/postings");
  });

  return (
    <form
      className="overflow-hidden rounded-xl border border-line bg-panel"
      onSubmit={submit}
    >
      <div className="divide-y divide-line-subtle">
        <section
          aria-labelledby="posting-overview-heading"
          className="grid gap-5 px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 lg:gap-10"
        >
          <div className="max-w-xs">
            <h3
              className="text-base font-semibold text-ink"
              id="posting-overview-heading"
            >
              Role overview
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Start with a clear title and a concise description of the work.
            </p>
          </div>
          <div className="space-y-5">
            <FormInput
              autoComplete="off"
              control={control}
              label="Job title"
              maxLength={160}
              name="title"
              required
            />
            <FormTextArea
              control={control}
              label="Description"
              maxLength={10000}
              name="description"
              required
              rows={5}
              showCount
            />
          </div>
        </section>

        <section
          aria-labelledby="posting-positions-heading"
          className="grid gap-5 px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 lg:gap-10"
        >
          <div className="max-w-xs">
            <h3
              className="text-base font-semibold text-ink"
              id="posting-positions-heading"
            >
              Who can apply
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Choose one hiring type, then select the positions covered by this
              posting.
            </p>
          </div>
          <div className="space-y-5">
            {positions.length === 0 && (
              <Alert
                description="Configure an active position and its scoring profile before adding it to a posting."
                message="No positions are ready to select"
                showIcon
                type="warning"
              />
            )}
            <div className="space-y-4">
              <FormSelect
                control={control}
                hint="A posting can include multiple positions, but they must share one hiring type."
                label="Hiring type"
                name="hiringTrack"
                onValueChange={(track) => {
                  const matchingPositionIds = new Set(
                    positions
                      .filter((position) => position.track === track)
                      .map((position) => position.id),
                  );
                  setValue(
                    "positionIds",
                    getValues("positionIds").filter((id) =>
                      matchingPositionIds.has(id),
                    ),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
                options={[
                  { label: "Teaching", value: HIRING_TRACKS[0] },
                  { label: "Non-teaching", value: HIRING_TRACKS[1] },
                ]}
                placeholder="Choose a hiring type"
                required
              />
              {hiringTrack && (
                <>
                  <FormCheckboxGroup
                    className={positionOptionClasses}
                    control={control}
                    disabled={Boolean(posting?.scoringLockedAt)}
                    hint="Applicants can apply separately to each selected position. Archived positions are available only when already linked to this posting."
                    label="Applicable positions"
                    name="positionIds"
                    options={positions
                      .filter((position) => position.track === hiringTrack)
                      .map((position) => ({
                        label: (
                          <span className="font-medium text-ink">
                            {position.title}
                            {!position.is_active && (
                              <span className="ml-2 text-xs font-normal text-muted">
                                Archived · existing posting
                              </span>
                            )}
                          </span>
                        ),
                        value: position.id,
                        disabled:
                          !position.is_active &&
                          !posting?.positionIds.includes(position.id),
                      }))}
                    required
                  />
                  {hiringTrack &&
                    positions.length > 0 &&
                    positions.every(
                      (position) => position.track !== hiringTrack,
                    ) && (
                      <p className="mt-2 text-sm text-muted">
                        No configured positions are available for this hiring
                        type.
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="posting-scoring-heading" className="grid gap-5 border-t border-line-subtle px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 lg:gap-10">
          <div className="max-w-xs">
            <h3 className="text-base font-semibold text-ink" id="posting-scoring-heading">Scoring rules</h3>
            <p className="mt-1 text-sm leading-6 text-muted">Use the saved position profile or adjust the point bands for this posting. Publishing locks its scoring rules.</p>
          </div>
          <div className="space-y-3">
            {selectedPositionIds.map((positionId) => {
              const position = positions.find((item) => item.id === positionId);
              if (!position) return null;
              const saved = scoring.find((entry) => entry.position_id === positionId);
              const rules = saved?.rules ?? position.scoringRules;
              return <div key={positionId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                <div><p className="font-semibold text-ink">{position.title}</p><p className="text-xs text-muted">Position profile v{position.scoringProfileVersion} | {saved ? "Saved posting rules" : "Adjust these defaults before publishing"} · {rules.filter((rule) => ["EDUCATION", "TRAINING", "EXPERIENCE"].includes(rule.criterion_key)).map((rule) => `${rule.title} ${rule.points} pts`).join(" · ")}</p></div>
                <div className="flex flex-wrap gap-2">
                <Button variant="bordered" disabled={Boolean(posting?.scoringLockedAt)} onClick={() => {
                  const current = getValues("scoring");
                  const next = current.filter((entry) => entry.position_id !== positionId);
                  next.push({ position_id: positionId, rules: position.scoringRules });
                  setValue("scoring", next, { shouldDirty: true, shouldValidate: true });
                }}>Load latest defaults</Button>
                <ScoringProfileEditor title={`${position.title} posting rules`} rules={rules} disabled={Boolean(posting?.scoringLockedAt)} requireComplete={true} label={posting?.scoringLockedAt ? "Rules locked" : "Edit posting rules"} onSave={async (nextRules) => {
                  const current = getValues("scoring");
                  const next = current.filter((entry) => entry.position_id !== positionId);
                  next.push({ position_id: positionId, rules: nextRules });
                  setValue("scoring", next, { shouldDirty: true, shouldValidate: true });
                  return { success: true, message: "Posting rules updated." };
                }} />
                </div>
              </div>;
            })}
            {posting?.scoringLockedAt && <Alert className="mt-3" message="These scoring rules were locked when the posting was published." type="info" showIcon />}
            <div className="mt-4 rounded-xl border border-line bg-panel-muted p-4">
              <h4 className="font-semibold text-ink">Automatic disqualification cutoff</h4>
              <p className="mt-1 text-sm leading-6 text-muted">Applications are disqualified only after every configured criterion has points. A total below this value is marked Not Qualified; a tie passes.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {selectedPositionIds.map((positionId, index) => {
                  const position = positions.find((item) => item.id === positionId);
                  const savedMinimum = posting?.minimumScores.find((entry) => entry.position_id === positionId)?.minimum_total_points;
                  const grandfatheredWithoutMinimum = posting?.status === "OPEN" &&
                    posting.positionIds.includes(positionId) && savedMinimum == null;
                  const required = postingStatus === "OPEN" && !grandfatheredWithoutMinimum;
                  const hint = required
                    ? "Required before a new posting opens."
                    : grandfatheredWithoutMinimum && postingStatus === "OPEN"
                      ? "This open posting has no cutoff yet. Set one when ready."
                      : "Optional while this posting is a draft or closed.";
                  return (
                    <FormInput
                      key={positionId}
                      control={control}
                      label={`${position?.title ?? "Position"} minimum total points`}
                      name={`minimumScores.${index}.minimum_total_points`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      required={required}
                      hint={hint}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="posting-settings-heading"
          className="grid gap-5 px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 lg:gap-10"
        >
          <div className="max-w-xs">
            <h3
              className="text-base font-semibold text-ink"
              id="posting-settings-heading"
            >
              Application settings
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Add applicant requirements, capacity and when applications close.
            </p>
          </div>
          <div className="space-y-5">
            <RequirementsEditor
              control={control}
              existingPdfUrl={posting?.requirementsPdfUrl ?? null}
              getValues={getValues}
              onPdfChange={setRequirementsPdf}
              onRemoveExistingPdf={setRemoveRequirementsPdf}
              removeExistingPdf={removeRequirementsPdf}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormInput
                control={control}
                label="Available slots"
                max={10000}
                min={1}
                name="slots"
                required
                step={1}
                type="number"
              />
              <FormDatePicker
                control={control}
                label="Application deadline"
                name="deadline"
                format="MMMM DD, YYYY"
                valueFormat="YYYY-MM-DDTHH:mm"
                disabledDate={(dateMap) => dayjs().isAfter(dateMap)}
              />
              <FormSelect
                control={control}
                label="Posting status"
                name="status"
                options={[
                  { label: "Draft", value: "DRAFT" },
                  { label: "Open for applications", value: "OPEN" },
                  { label: "Closed", value: "CLOSED" },
                ]}
                required
              />
            </div>
          </div>
        </section>

        {(error || message) && (
          <div className="border-t border-line-subtle px-5 py-5 sm:px-7">
            {error && <Alert message={error} showIcon type="error" />}
            {message && <Alert message={message} showIcon type="success" />}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-line-subtle bg-panel-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p aria-live="polite" className="text-sm text-muted">
          {isDirty || requirementsPdf !== null || removeRequirementsPdf
            ? "Unsaved changes"
            : "No changes yet"}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            disabled={isSubmitting}
            onClick={() =>
            router.push(
              posting ? `/hr/postings/${posting.id}` : "/hr/postings",
            )
            }
            variant="bordered"
          >
            Cancel
          </Button>
          <Button
            disabled={!isDirty && !requirementsPdf && !removeRequirementsPdf}
            loading={isSubmitting}
            type="submit"
            variant="filled"
          >
            {savedPostingId ? "Save changes" : "Create posting"}
          </Button>
        </div>
      </div>
    </form>
  );
}
