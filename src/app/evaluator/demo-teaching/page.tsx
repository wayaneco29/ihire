import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { formatPositionLabel } from "@/utils/format-position-track";
import { ApplicationCriterionScoresForm } from "../applications/components/ApplicationCriterionScoresForm";
import { ApplicantNumberLookup } from "../reviews/components/ApplicantNumberLookup";

export default async function EvaluatorDemoTeachingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    applicantNumber?: string | string[];
    applicationId?: string | string[];
  }>;
}>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const {
    applicantNumber: requestedApplicantNumber,
    applicationId: requestedApplicationId,
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
  const applicationIds = applications.map((application) => application.application_id);
  const jobIds = [...new Set(applications.map((application) => application.job_id))];

  const [detailsResult, jobsResult] = applicationIds.length
    ? await Promise.all([
        evaluator.supabase
          .from("applications")
          .select("id, job_id, position_id")
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
    (criteriaResult.data ?? []).map((criterion) => [
      criterion.id,
      criterion,
    ]),
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
        description="Find a teaching applicant, verify the job description, and enter only the demo-teaching observation points."
        eyebrow="Evaluator workspace"
        title="Demo teaching points"
      />
      <ApplicantNumberLookup
        initialApplicantNumber={applicantNumber}
        searchPath="/evaluator/demo-teaching"
      />
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
                    href={`/evaluator/demo-teaching?applicantNumber=${encodeURIComponent(applicantNumber)}&applicationId=${application.application_id}`}
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
            const jobPosition =
              details?.position_id
                ? jobPositionByKey.get(
                    `${application.job_id}:${details.position_id}`,
                  )
                : undefined;
            const criterionWeights = (weightsResult.data ?? []).filter(
              (weight) => weight.profile_id === jobPosition?.weight_profile_id,
            );
            const demoCriterion = criterionWeights
              .flatMap((weight) => {
                const criterion = criteriaById.get(weight.criterion_id);
                return criterion
                  ? [{ weight, criterion }]
                  : [];
              })
              .find(
                (item) =>
                  item.criterion.criterion_key === "CLASSROOM_OBSERVATION",
              );

            return (
              <article
                className="overflow-hidden rounded-sm border border-line bg-panel"
                key={application.application_id}
              >
                <header className="border-b border-line-subtle bg-panel-muted px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {application.applicant_number}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
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
                </header>
                <div className="space-y-5 p-5 sm:p-6">
                  {applications.length > 1 && (
                    <Link
                      className="inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline"
                      href={`/evaluator/demo-teaching?applicantNumber=${encodeURIComponent(applicantNumber)}`}
                    >
                      Choose a different applied job
                    </Link>
                  )}
                  <section aria-label="Job description">
                    <h3 className="text-sm font-semibold text-ink">
                      Job description
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {job?.description ?? "Job description unavailable."}
                    </p>
                    {job?.requirements && (
                      <>
                        <h4 className="mt-4 text-sm font-semibold text-ink">
                          Requirements
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                          {job.requirements}
                        </p>
                      </>
                    )}
                  </section>

                  {application.position_track !== "TEACHING" ? (
                    <p className="rounded-sm border border-line-subtle bg-panel-muted p-4 text-sm text-muted">
                      Demo-teaching points are only available for teaching
                      positions.
                    </p>
                  ) : !demoCriterion ? (
                    <p className="rounded-sm border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                      The demo-teaching criterion is not configured for this
                      position.
                    </p>
                  ) : (
                    <ApplicationCriterionScoresForm
                      applicationId={application.application_id}
                      applicationStatus={application.application_status}
                      criteria={[
                        {
                          id: demoCriterion.criterion.id,
                          title: demoCriterion.criterion.title,
                          maxPoints: demoCriterion.weight.points,
                        },
                      ]}
                      existingScores={{
                        [demoCriterion.criterion.id]:
                          savedScoreByKey.get(
                            `${application.application_id}:${demoCriterion.criterion.id}`,
                          ) ?? null,
                      }}
                      scoresUnavailable={false}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
