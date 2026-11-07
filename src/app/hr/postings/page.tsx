import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { PostingsManager } from "./components/PostingsManager";

export default async function HrPostingsPage() {
  const hr = await getHrContext();
  if (!hr) redirect("/login");
  const { data: postings, error } = await hr.supabase.from("job_postings")
    .select("id, title, description, slots, status, deadline, created_at")
    .order("created_at", { ascending: false });
  if (error) return <><PageHeader eyebrow="HR workspace" title="Job postings" /><div className="mt-7"><EmptyState description="Refresh the page to try again." title="Postings unavailable" /></div></>;

  const ids = (postings ?? []).map((posting) => posting.id);
  const { data: applications } = ids.length
    ? await hr.supabase.from("v_anonymized_applicants").select("job_id, application_status").in("job_id", ids)
    : { data: [] };
  const stats = new Map<string, { total: number; qualified: number; hired: number }>();
  for (const application of applications ?? []) {
    const row = stats.get(application.job_id) ?? { total: 0, qualified: 0, hired: 0 };
    row.total += 1;
    if (application.application_status === "QUALIFIED") row.qualified += 1;
    if (application.application_status === "HIRED") row.hired += 1;
    stats.set(application.job_id, row);
  }

  return <>
    <PageHeader actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark" href="/hr/postings/new">Create posting</Link>} description="Create positions and track evaluator outcomes for each posting." eyebrow="HR workspace" title="Job postings" />
    {(postings ?? []).length ? <PostingsManager postings={(postings ?? []).map((posting) => ({ ...posting, ...(stats.get(posting.id) ?? { total: 0, qualified: 0, hired: 0 }) }))} /> : (
      <div className="mt-7"><EmptyState action={<Link className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-primary hover:bg-primary-light" href="/hr/postings/new">Create a job posting</Link>} description="Your postings will appear here, with applicant and qualification counts." title="No postings yet" /></div>
    )}
  </>;
}
