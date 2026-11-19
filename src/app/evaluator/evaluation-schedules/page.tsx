import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getEvaluatorContext } from "@/lib/auth/server";
import { formatPositionLabel } from "@/utils/format-position-track";
import {
  formatPhilippineDateTime,
  formatPhilippineDay,
  formatPhilippineTime,
  philippineToday,
  shiftIsoDate,
  validIsoDate,
} from "@/utils/philippine-time";
import { ApplicationCriterionScoresForm } from "../applications/components/ApplicationCriterionScoresForm";

export default function EvaluationSchedulesPage(props: {
  searchParams: Promise<{
    applicantNumber?: string | string[];
    applicationId?: string | string[];
    date?: string | string[];
  }>;
}) {
  return TeachingAssessmentPage({ ...props, showSchedule: true });
}

export async function TeachingAssessmentPage({
  searchParams,
  showSchedule,
}: Readonly<{
  searchParams: Promise<{
    applicantNumber?: string | string[];
    applicationId?: string | string[];
    date?: string | string[];
  }>;
  showSchedule: boolean;
}>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/");

  const {
    applicantNumber: requestedApplicantNumber,
    applicationId: requestedApplicationId,
    date: requestedDate,
  } = await searchParams;
  const applicantNumber =
    typeof requestedApplicantNumber === "string"
      ? requestedApplicantNumber.trim().toLocaleUpperCase()
      : "";
  const validApplicantNumber = /^APP-\d{4,}$/.test(applicantNumber);
  const applicationId =
    typeof requestedApplicationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(requestedApplicationId)
      ? requestedApplicationId
      : "";
  const today = philippineToday();
  const date =
    typeof requestedDate === "string" && validIsoDate(requestedDate)
      ? requestedDate
      : today;
  const nextDate = shiftIsoDate(date, 1);

  const { data: scheduledRows, error: scheduleError } = await evaluator.supabase
    .from("applications")
    .select("id, job_id, scheduled_assessment_at")
    .eq("assigned_evaluator_id", evaluator.user.id)
    .eq("status", "ASSESSMENT_SCHEDULED")
    .gte("scheduled_assessment_at", `${date}T00:00:00+08:00`)
    .lt("scheduled_assessment_at", `${nextDate}T00:00:00+08:00`)
    .order("scheduled_assessment_at", { ascending: true });
  const scheduledIds = (scheduledRows ?? []).map((row) => row.id);
  const [scheduledApplicantsResult, scheduledJobsResult] = await Promise.all([
    scheduledIds.length
      ? evaluator.supabase
          .from("v_anonymized_applicants")
          .select(
            "application_id, applicant_number, application_status, position_title, position_track",
          )
          .in("application_id", scheduledIds)
          .eq("position_track", "TEACHING")
      : Promise.resolve({ data: [], error: null }),
    scheduledRows?.length
      ? evaluator.supabase
          .from("job_postings")
          .select("id, title")
          .in("id", [...new Set(scheduledRows.map((row) => row.job_id))])
      : Promise.resolve({ data: [], error: null }),
  ]);
  const scheduledApplicantById = new Map(
    (scheduledApplicantsResult.data ?? []).map((row) => [
      row.application_id,
      row,
    ]),
  );
  const scheduledJobById = new Map(
    (scheduledJobsResult.data ?? []).map((row) => [row.id, row.title]),
  );
  const teachingSchedule = (scheduledRows ?? []).flatMap((row) => {
    const applicant = scheduledApplicantById.get(row.id);
    return applicant ? [{ ...row, applicant }] : [];
  });

  const applicationsResult = validApplicantNumber
    ? await evaluator.supabase
        .from("v_anonymized_applicants")
        .select(
          "application_id, applicant_number, application_status, job_id, position_title, position_track",
        )
        .eq("applicant_number", applicantNumber)
        .order("applied_at", { ascending: false })
    : { data: [], error: null };
  const applications = applicationsResult.data ?? [];
  const selectedApplication =
    applications.length === 1
      ? applications[0]
      : applications.find(
          (application) => application.application_id === applicationId,
        );
  const applicationIds = applications.map(
    (application) => application.application_id,
  );
  const jobIds = [
    ...new Set(applications.map((application) => application.job_id)),
  ];

  const [detailsResult, jobsResult] = applicationIds.length
    ? await Promise.all([
        evaluator.supabase
          .from("applications")
          .select("id, job_id, position_id, scheduled_assessment_at")
          .in("id", applicationIds),
        evaluator.supabase
          .from("job_postings")
          .select("id, title, description, requirements")
          .in("id", jobIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const details = detailsResult.data ?? [];
  const positionIds = [
    ...new Set(
      details
        .map((application) => application.position_id)
        .filter((positionId): positionId is string => positionId !== null),
    ),
  ];
  const jobPositionsResult =
    jobIds.length && positionIds.length
      ? await evaluator.supabase
          .from("job_posting_positions")
          .select("job_id, position_id, weight_profile_id")
          .in("job_id", jobIds)
          .in("position_id", positionIds)
      : { data: [], error: null };

  const weightProfileIds = [
    ...new Set(
      (jobPositionsResult.data ?? []).map(
        (jobPosition) => jobPosition.weight_profile_id,
      ),
    ),
  ];
  const weightsResult = weightProfileIds.length
    ? await evaluator.supabase
        .from("position_criterion_weights")
        .select("profile_id, criterion_id, points")
        .in("profile_id", weightProfileIds)
    : { data: [], error: null };
  const criterionIds = [
    ...new Set((weightsResult.data ?? []).map((weight) => weight.criterion_id)),
  ];
  const [criteriaResult, savedScoresResult] = await Promise.all([
    criterionIds.length
      ? evaluator.supabase
          .from("position_criteria")
          .select("id, criterion_key, title")
          .in("id", criterionIds)
      : Promise.resolve({ data: [], error: null }),
    applicationIds.length
      ? evaluator.supabase
          .from("application_criterion_scores")
          .select("application_id, criterion_id, points")
          .in("application_id", applicationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const lookupUnavailable = Boolean(
    applicationsResult.error ||
    detailsResult.error ||
    jobsResult.error ||
    jobPositionsResult.error ||
    weightsResult.error ||
    criteriaResult.error ||
    savedScoresResult.error,
  );
  const jobsById = new Map(
    (jobsResult.data ?? []).map((job) => [job.id, job] as const),
  );
  const detailsById = new Map(
    details.map((application) => [application.id, application] as const),
  );
  const jobPositionByKey = new Map(
    (jobPositionsResult.data ?? []).map((jobPosition) => [
      `${jobPosition.job_id}:${jobPosition.position_id}`,
      jobPosition,
    ]),
  );
  const criteriaById = new Map(
    (criteriaResult.data ?? []).map((criterion) => [criterion.id, criterion]),
  );
  const savedScoreByKey = new Map(
    (savedScoresResult.data ?? []).map((score) => [
      `${score.application_id}:${score.criterion_id}`,
      score.points,
    ]),
  );

  return (
    <>
      <PageHeader
        description="Review scheduled teaching assessments and record points for each activity."
        eyebrow="Evaluator workspace"
        title="Evaluation Schedules"
      />
      {showSchedule && (
        <Link
          className="mb-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:text-primary-dark"
          href="/evaluator/reviews"
        >
          Review scored applicants
        </Link>
      )}
      {!showSchedule ? (
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-primary text-sm px-4 py-1.5 hover:bg-primary-light rounded-sm transition-colors"
          href={`/evaluator/evaluation-schedules?date=${date}`}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" /> Back to
          schedule
        </Link>
      ) : undefined}
      {showSchedule && (
        <section
          aria-labelledby="schedule-heading"
          className="overflow-hidden rounded-sm border border-line bg-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-subtle p-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-ink" id="schedule-heading">
                Scheduled applicants
              </h2>
              <p className="mt-1 text-sm text-muted">
                {formatPhilippineDay(date)} · {teachingSchedule.length} teaching{" "}
                {teachingSchedule.length === 1 ? "applicant" : "applicants"}
              </p>
            </div>
            {/* <nav
              aria-label="Assessment date"
              className="flex flex-wrap items-center gap-2"
            >
              <Link
                className="inline-flex min-h-10 items-center rounded-sm border border-line px-3 text-sm font-semibold text-ink hover:bg-panel-muted"
                href={`/evaluator/evaluation-schedules?date=${shiftIsoDate(date, -1)}`}
              >
                Previous day
              </Link>
              {date !== today && (
                <Link
                  className="inline-flex min-h-10 items-center rounded-sm border border-line px-3 text-sm font-semibold text-primary hover:bg-primary-light"
                  href="/evaluator/evaluation-schedules"
                >
                  Today
                </Link>
              )}
              <Link
                className="inline-flex min-h-10 items-center rounded-sm border border-line px-3 text-sm font-semibold text-ink hover:bg-panel-muted"
                href={`/evaluator/evaluation-schedules?date=${nextDate}`}
              >
                Next day
              </Link>
            </nav> */}
          </div>
          {scheduleError ||
          scheduledApplicantsResult.error ||
          scheduledJobsResult.error ? (
            <p className="p-5 text-sm text-danger" role="alert">
              The assessment schedule could not be loaded. Refresh and try
              again.
            </p>
          ) : teachingSchedule.length === 0 ? (
            <p className="p-5 text-sm text-muted">
              No teaching applicants are awaiting assessment on this day.
              Choose another date to review upcoming assessments.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-panel-muted text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3" scope="col">
                      Time
                    </th>
                    <th className="px-5 py-3" scope="col">
                      Applicant
                    </th>
                    <th className="px-5 py-3" scope="col">
                      Position / job
                    </th>
                    <th className="px-5 py-3" scope="col">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right" scope="col">
                      Assessment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {teachingSchedule.map((row) => (
                    <tr
                      className={
                        row.id === applicationId
                          ? "bg-primary-light/40"
                          : "hover:bg-panel-muted/60"
                      }
                      key={row.id}
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-ink">
                        {row.scheduled_assessment_at
                          ? formatPhilippineTime(row.scheduled_assessment_at)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-ink">
                        {row.applicant.applicant_number}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">
                          {row.applicant.position_title ??
                            "Position not recorded"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {scheduledJobById.get(row.job_id) ??
                            "Job posting unavailable"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <WorkflowStatusTag
                          status={row.applicant.application_status}
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          className="inline-flex min-h-10 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                          href={`/evaluator/evaluation-schedules/${row.id}?date=${date}&applicantNumber=${encodeURIComponent(row.applicant.applicant_number)}`}
                        >
                          Enter points
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {applicantNumber && !validApplicantNumber && (
        <p className="mt-4 text-sm text-danger" role="alert">
          Enter an applicant number such as APP-0001.
        </p>
      )}
      {validApplicantNumber && lookupUnavailable && (
        <p className="mt-4 text-sm text-danger" role="alert">
          Applicant details or scoring information could not be loaded. Refresh
          the page and try again.
        </p>
      )}
      {validApplicantNumber &&
        !lookupUnavailable &&
        applications.length === 0 && (
          <p className="mt-4 rounded-sm border border-line bg-panel p-4 text-sm text-muted">
            No applications found for {applicantNumber}.
          </p>
        )}
      {validApplicantNumber &&
        !lookupUnavailable &&
        applications.length > 1 &&
        !selectedApplication && (
          <section className="mt-5 rounded-sm border border-line bg-panel p-5">
            <h2 className="font-semibold text-ink">
              Select an application for {applicantNumber}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Only jobs this applicant applied to are listed.
            </p>
            <ul className="mt-3 divide-y divide-line-subtle">
              {applications.map((application) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                  key={application.application_id}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {jobsById.get(application.job_id)?.title ??
                        "Job posting unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {application.position_title
                        ? formatPositionLabel(
                            application.position_title,
                            application.position_track ?? "",
                          )
                        : "Position not recorded"}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-10 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                    href={`/evaluator/evaluation-schedules?date=${date}&applicantNumber=${encodeURIComponent(applicantNumber)}&applicationId=${application.application_id}`}
                  >
                    View this job
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      {selectedApplication && (
        <div className="mt-5 space-y-5">
          {[selectedApplication].map((application) => {
            const details = detailsById.get(application.application_id);
            const job = jobsById.get(application.job_id);
            const jobPosition = details?.position_id
              ? jobPositionByKey.get(
                  `${application.job_id}:${details.position_id}`,
                )
              : undefined;
            const criterionWeights = (weightsResult.data ?? []).filter(
              (weight) => weight.profile_id === jobPosition?.weight_profile_id,
            );
            const assessmentCriteria = criterionWeights
              .flatMap((weight) => {
                const criterion = criteriaById.get(weight.criterion_id);
                return criterion ? [{ weight, criterion }] : [];
              })
              .filter((item) =>
                ["CLASSROOM_OBSERVATION", "TEACHER_REFLECTION"].includes(
                  item.criterion.criterion_key,
                ),
              )
              .sort((first, second) =>
                first.criterion.criterion_key === "CLASSROOM_OBSERVATION"
                  ? -1
                  : second.criterion.criterion_key === "CLASSROOM_OBSERVATION"
                    ? 1
                    : 0,
              );

            return (
              <article className="space-y-5" key={application.application_id}>
                <header className="rounded-sm border border-line bg-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">
                        Applicant {application.applicant_number}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold leading-snug text-ink">
                        {job?.title ?? "Job posting unavailable"}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {application.position_title
                          ? formatPositionLabel(
                              application.position_title,
                              application.position_track ?? "",
                            )
                          : "Position not recorded"}
                      </p>
                    </div>
                    <WorkflowStatusTag
                      status={application.application_status}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted">
                      <CalendarDaysIcon
                        aria-hidden="true"
                        className="size-5 text-primary"
                      />
                      {details?.scheduled_assessment_at
                        ? formatPhilippineDateTime(
                            details.scheduled_assessment_at,
                          )
                        : "Assessment schedule not set"}
                    </p>
                  </div>
                </header>
                <div className="grid items-start gap-5]">
                  <div>
                    {application.position_track !== "TEACHING" ? (
                      <p className="rounded-sm border border-line-subtle bg-panel-muted p-4 text-sm text-muted">
                        Teaching assessment points are only available for
                        teaching positions.
                      </p>
                    ) : assessmentCriteria.length !== 2 ? (
                      <p className="rounded-sm border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                        Demo teaching and teaching reflection form criteria must
                        both be configured for this position.
                      </p>
                    ) : (
                      <ApplicationCriterionScoresForm
                        applicationId={application.application_id}
                        returnHref={`/evaluator/evaluation-schedules?date=${date}`}
                        applicationStatus={application.application_status}
                        criteria={assessmentCriteria.map(
                          ({ criterion, weight }) => ({
                            id: criterion.id,
                            title:
                              criterion.criterion_key ===
                              "CLASSROOM_OBSERVATION"
                                ? "Demo teaching points"
                                : "Teaching reflection form points",
                            maxPoints: weight.points,
                          }),
                        )}
                        existingScores={Object.fromEntries(
                          assessmentCriteria.map(({ criterion }) => [
                            criterion.id,
                            savedScoreByKey.get(
                              `${application.application_id}:${criterion.id}`,
                            ) ?? null,
                          ]),
                        )}
                        scoresUnavailable={false}
                      />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
