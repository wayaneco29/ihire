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

type PositionOption = {
  id: string;
  title: string;
  track: string;
  is_active: boolean;
};

type Values = PostingValues;

type PostingSeed = Values & { id: string };

const positionOptionClasses = [].join(" ");

export function PostingForm({
  posting,
  positions,
}: Readonly<{ posting?: PostingSeed; positions: PositionOption[] }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<Values>({
    mode: "onChange",
    resolver: yupResolver(postingSchema) as Resolver<Values>,
    defaultValues: posting
      ? {
          title: posting.title,
          description: posting.description,
          requirements: posting.requirements,
          slots: posting.slots,
          deadline: "",
          status: posting.status,
          hiringTrack: posting.hiringTrack,
          positionIds: posting.positionIds,
        }
      : {
          title: "",
          description: "",
          requirements: "",
          slots: 1,
          deadline: "",
          status: "DRAFT",
          positionIds: [],
        },
  });
  const hiringTrack = useWatch({ control, name: "hiringTrack" });

  useEffect(() => {
    if (!posting?.deadline) return;
    const date = new Date(posting.deadline);
    if (!Number.isFinite(date.getTime())) return;
    const localValue = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);
    reset({ ...posting, deadline: localValue });
  }, [posting, reset]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    const payload = {
      ...values,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : "",
    };
    const result = posting
      ? await updateJobPosting(posting.id, payload)
      : await createJobPosting(payload);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
    router.push(posting ? `/hr/postings/${posting.id}` : "/hr/postings");
  });

  return (
    <form
      className="mt-8 overflow-hidden rounded-md border border-line bg-panel shadow-card"
      onSubmit={submit}
    >
      <div className="border-b border-line-subtle px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="text-base font-semibold text-ink">
          Posting information
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          Describe the opportunity, choose the roles it covers, and set how
          applicants can respond.
        </p>
      </div>

      <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
        <section aria-labelledby="posting-overview-heading">
          <div className="mb-4">
            <h3
              className="text-sm font-semibold text-ink"
              id="posting-overview-heading"
            >
              Role overview
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Start with a clear title and a concise description of the work.
            </p>
          </div>
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
        </section>

        <section
          aria-labelledby="posting-positions-heading"
          className="rounded-md border border-primary/20 bg-primary-light/40 p-4 sm:p-5"
        >
          <div className="mb-4">
            <h3
              className="text-sm font-semibold text-ink"
              id="posting-positions-heading"
            >
              Who can apply
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Choose one hiring type, then select the positions covered by this
              posting.
            </p>
          </div>
          {positions.length === 0 && (
            <Alert
              className="mb-4"
              description="Configure an active position and its scoring profile before adding it to a posting."
              message="No positions are ready to select"
              showIcon
              type="warning"
            />
          )}
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
          <FormCheckboxGroup
            className={positionOptionClasses}
            control={control}
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
            positions.every((position) => position.track !== hiringTrack) && (
              <p className="mt-2 text-sm text-muted">
                No configured positions are available for this hiring type.
              </p>
            )}
        </section>

        <section
          aria-labelledby="posting-settings-heading"
          className="border-t border-line-subtle pt-6"
        >
          <div className="mb-4">
            <h3
              className="text-sm font-semibold text-ink"
              id="posting-settings-heading"
            >
              Application settings
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Add any qualifications and define the application window.
            </p>
          </div>
          <FormTextArea
            control={control}
            hint="Include qualifications and supporting details for applicants."
            label="Requirements"
            maxLength={10000}
            name="requirements"
            rows={4}
            showCount
          />
          <div className="grid gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
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
              hint="Leave blank for no deadline."
              label="Application deadline"
              name="deadline"
              format="MMMM DD, YYYY"
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
        </section>

        {error && <Alert message={error} showIcon type="error" />}
        {message && <Alert message={message} showIcon type="success" />}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line-subtle bg-panel-muted px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
        <Button
          disabled={isSubmitting}
          onClick={() =>
            router.push(posting ? `/hr/postings/${posting.id}` : "/hr/postings")
          }
          variant="bordered"
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} variant="filled">
          {posting ? "Save changes" : "Create posting"}
        </Button>
      </div>
    </form>
  );
}
