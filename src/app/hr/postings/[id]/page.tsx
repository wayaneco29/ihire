import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { PostingApplicants } from "./components/PostingApplicants";

export default async function HrPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/login");

  const { data: posting, error: postingError } = await hr.supabase.from("job_postings")
    .select("id, title, description, requirements, slots, status, deadline, created_at")
    .eq("id", id)
    .maybeSingle();
  if (postingError || !posting) notFound();

  const { data: applicants, error } = await hr.supabase.from("v_anonymized_applicants")
    .select("application_id, applicant_number, application_status, applied_at, education_levels, experience_years, training_hours, skills")
    .eq("job_id", posting.id)
    .order("applied_at", { ascending: false });

  return <>
    <PageHeader
      actions={<Link className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink hover:bg-slate-50" href={`/hr/postings/${posting.id}/edit`}>Edit posting</Link>}
      description={posting.description}
      eyebrow="HR workspace · Job posting"
      title={posting.title}
    />
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3"><WorkflowStatusTag status={posting.status} /><span className="text-sm text-muted">{posting.slots} slots</span><span className="text-sm text-muted">{posting.deadline ? `Deadline ${formatDate(posting.deadline, "MMM D, YYYY h:mm A")}` : "No deadline"}</span></div>
      {posting.requirements && <div className="mt-5 border-t border-slate-100 pt-4"><h2 className="text-sm font-semibold text-ink">Requirements</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{posting.requirements}</p></div>}
    </section>
    {error ? <div className="mt-7"><EmptyState description="Refresh the page to load this posting's applicants." title="Applicants unavailable" /></div> : <PostingApplicants applicants={applicants ?? []} jobId={posting.id} slots={posting.slots} />}
  </>;
}
