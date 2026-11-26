import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaffApplicationList } from "@/components/application/StaffApplicationList";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsApplicationsPage() {
  const sds = await getSdsContext();
  if (!sds) redirect("/");
  const { data, error } = await sds.supabase
    .from("v_staff_application_reviews")
    .select("application_id, applicant_name, applicant_number, application_status, applied_at, job_title, position_title")
    .order("applied_at", { ascending: false });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="SDS workspace" title="Applicant applications" description="Review applicant details, scoring, and PDS records. Make hiring decisions with required remarks." />
      {error ? <EmptyState title="Applications unavailable" description="Refresh the page to load application records." /> : <StaffApplicationList applications={data ?? []} basePath="/sds" />}
    </div>
  );
}
