"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormDatePicker } from "@/components/form/FormDatePicker";
import {
  formatPhilippineDateTime,
  formatPhilippineDateTimeInput,
  toPhilippineISOString,
} from "@/utils/philippine-time";
import { scheduleApplicationAssessment } from "../actions";
import {
  applicationAssessmentScheduleSchema,
  type ApplicationAssessmentScheduleValues,
} from "../schema";

export function ApplicationAssessmentScheduleForm({
  applicationId,
  applicationStatus,
  scheduledAt,
  scheduleUnavailable,
}: {
  applicationId: string;
  applicationStatus: string;
  scheduledAt: string | null;
  scheduleUnavailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ApplicationAssessmentScheduleValues>({
    resolver: yupResolver(applicationAssessmentScheduleSchema),
    defaultValues: {
      scheduledAt: formatPhilippineDateTimeInput(scheduledAt),
    },
  });
  const isFinal = ["HIRED", "REJECTED"].includes(applicationStatus);

  function submit(values: ApplicationAssessmentScheduleValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await scheduleApplicationAssessment({
        applicationId,
        scheduledAt: toPhilippineISOString(values.scheduledAt),
      });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <section className="rounded-sm border border-line bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-ink">Assessment schedule</h2>
        <p className="mt-1 text-sm text-muted">
          Set or update the applicant&apos;s assessment date and time. Times are
          entered in Philippine time (UTC+08:00).
        </p>
        {scheduledAt && (
          <p className="mt-2 text-sm font-medium text-ink">
            Current schedule: {formatPhilippineDateTime(scheduledAt)}
          </p>
        )}
      </div>
      {scheduleUnavailable ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          The current schedule could not be loaded. Refresh and try again.
        </p>
      ) : isFinal ? (
        <p className="mt-4 text-sm text-muted">
          The application has a final hiring decision and can no longer be
          scheduled.
        </p>
      ) : (
        <form
          className="mt-5 space-y-4 border-t border-line-subtle pt-5"
          onSubmit={form.handleSubmit(submit)}
        >
          <FormDatePicker
            control={form.control}
            format="MMM D, YYYY h:mm A"
            label="Assessment date and time"
            name="scheduledAt"
            popupClassName="assessment-schedule-picker-dropdown"
            required
            showTime={{ format: "h:mm A", use12Hours: true }}
            valueFormat="YYYY-MM-DDTHH:mm"
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending
              ? "Saving schedule…"
              : scheduledAt
                ? "Update schedule"
                : "Schedule assessment"}
          </button>
          {message && (
            <p
              className={`text-sm ${message === "Assessment schedule saved." ? "text-primary" : "text-danger"}`}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
