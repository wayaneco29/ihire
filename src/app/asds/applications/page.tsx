import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaffApplicationList } from "@/components/application/StaffApplicationList";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsApplicationsPage() {
  const asds = await getAsdsContext();
  if (!asds) redirect("/");
  const { data, error } = await asds.supabase
    .from("v_staff_application_reviews")
    .select("application_id, applicant_name, applicant_number, application_status, applied_at, job_title, position_title")
    .order("applied_at", { ascending: false });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="ASDS workspace" title="Applicant applications" description="View applications, scoring summaries, applicant names, and PDS records." />
      {error ? <EmptyState title="Applications unavailable" description="Refresh the page to load application records." /> : <StaffApplicationList applications={data ?? []} basePath="/asds" />}
    </div>
  );
}
