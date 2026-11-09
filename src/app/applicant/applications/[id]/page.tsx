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
        description="Track the review history and details for this application."
        eyebrow="My applications"
        title={job?.title ?? "Application details"}
        actions={<WorkflowStatusTag status={application.status} />}
      />

      <div className="mt-7 grid gap-5">
        <section className="h-fit rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-7">
          <div className="border-b border-line-subtle pb-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Status timeline
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Updates as your application moves through review.
            </p>
          </div>
          <ApplicationTimeline
            currentStatus={application.status}
            events={events}
          />
        </section>
      </div>
    </>
  );
}
