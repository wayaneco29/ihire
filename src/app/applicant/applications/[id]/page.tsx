import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import {
  ApplicationTimeline,
  type ApplicationEvent,
} from "./components/ApplicationTimeline";

export default async function ApplicantApplicationDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await applicant.supabase
    .from("applications")
    .select("id, job_id, status, applied_at")
    .eq("id", id)
    .eq("applicant_id", applicant.applicant.id)
    .maybeSingle();

  if (error) {
    return (
      <EmptyState
        description="Refresh the page to try loading this application again."
        title="Application details unavailable"
      />
    );
  }
  if (!application) notFound();

  const [{ data: job }, { data: evaluations }, { data: decision }] =
    await Promise.all([
      applicant.supabase
        .from("job_postings")
        .select("title, description, requirements, slots, deadline")
        .eq("id", application.job_id)
        .maybeSingle(),
      applicant.supabase
        .from("application_evaluations")
        .select("id, result, remarks, evaluated_at")
        .eq("application_id", application.id)
        .order("evaluated_at", { ascending: true }),
      applicant.supabase
        .from("hiring_decisions")
        .select("decision, decided_at")
        .eq("application_id", application.id)
        .maybeSingle(),
    ]);

  const events: ApplicationEvent[] = [
    {
      id: "submitted",
      title: "Application submitted",
      status: "SUBMITTED",
      date: application.applied_at,
      remarks: null,
    },
    ...(evaluations ?? []).map((evaluation) => ({
      id: evaluation.id,
      title: `Evaluator assessment: ${evaluation.result.replaceAll("_", " ").toLowerCase()}`,
      status: evaluation.result,
      date: evaluation.evaluated_at,
      remarks: evaluation.remarks,
    })),
    ...(decision
      ? [
          {
            id: `decision-${application.id}`,
            title:
              decision.decision === "HIRED"
                ? "Hiring decision recorded"
                : "Application decision recorded",
            status: decision.decision,
            date: decision.decided_at,
            remarks: null,
          },
        ]
      : []),
  ];

  if (events.at(-1)?.status !== application.status) {
    events.push({
      id: `current-${application.id}`,
      title: "Current application status",
      status: application.status,
      date: null,
      remarks: null,
    });
  }

  return (
    <>
      <PageHeader
        description={job?.title ?? "Job application"}
        eyebrow="My applications"
        title="Application details"
      />

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Status timeline</h2>
            <WorkflowStatusTag status={application.status} />
          </div>
          <ApplicationTimeline
            currentStatus={application.status}
            events={events}
          />
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <h2 className="font-semibold text-ink">Job information</h2>
            {job ? (
              <>
                <h3 className="mt-4 text-lg font-semibold text-ink">
                  {job.title}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {job.description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-panel-muted p-3">
                  <div>
                    <dt className="text-xs text-muted">Positions</dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {job.slots}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Deadline</dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {job.deadline
                        ? formatDate(job.deadline)
                        : "Not specified"}
                    </dd>
                  </div>
                </dl>
                {job.requirements && (
                  <div className="mt-4 border-t border-line-subtle pt-4">
                    <h4 className="text-sm font-semibold text-ink">
                      Requirements
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {job.requirements}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">
                This posting is no longer available.
              </p>
            )}
            <p className="mt-5 border-t border-line-subtle pt-4 text-xs text-muted">
              Submitted {formatDate(application.applied_at)}
            </p>
          </section>
          <section className="rounded-2xl border border-primary/15 bg-primary-light/60 p-5">
            <h2 className="font-semibold text-primary">Evaluator remarks</h2>
            <p className="mt-2 text-sm leading-6 text-ink">
              Remarks from each evaluation are shown in the timeline when
              available.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
