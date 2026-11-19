import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHrContext } from "@/lib/auth/server";
import { hydratePdsDraftData } from "@/app/applicant/pds/load-draft-data";
import type { Json } from "@/types/database";
import { PrintablePdsDocument } from "./components/PrintablePdsDocument";
import { PdsPrintButton } from "./components/PdsPrintButton";

export default async function HrPrintablePdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error: accessError } = await hr.supabase
    .from("v_anonymized_applicants")
    .select("application_id, applicant_number, application_status")
    .eq("application_id", id)
    .maybeSingle();
  if (accessError || !application || application.application_status !== "HIRED") notFound();

  const { data: applicationRecord, error: applicationError } = await hr.supabase
    .from("applications")
    .select("pds_version_id")
    .eq("id", application.application_id)
    .maybeSingle();
  if (applicationError || !applicationRecord) notFound();

  let pdsData: Json | null = null;
  let versionNumber = 1;
  let emptyStateDescription =
    "The submitted PDS could not be loaded. Refresh the page to try again.";
  try {
    const admin = createAdminClient();
    const { data: version, error } = await admin.from("pds_versions")
      .select("id, status, version_no, draft_data")
      .eq("id", applicationRecord.pds_version_id)
      .eq("status", "SUBMITTED")
      .maybeSingle();
    if (error || !version) {
      emptyStateDescription =
        "The submitted PDS could not be loaded. Refresh the page to try again.";
    } else {
      pdsData = await hydratePdsDraftData(admin, version.id, version.draft_data);
      versionNumber = version.version_no;
    }
  } catch {
    emptyStateDescription =
      "Secure PDS access is not configured in this environment.";
  }
  if (!pdsData) {
    return (
      <>
        <PageHeader eyebrow="HR workspace" title="Printable PDS" />
        <div className="mt-7">
          <EmptyState description={emptyStateDescription} title="PDS unavailable" />
        </div>
      </>
    );
  }

  return <>
    <div className="no-print mb-6">
      <PageHeader actions={<PdsPrintButton />} description="This identity-bearing sheet is available only after the applicant is hired." eyebrow="HR workspace · Hired applicant" title={`Printable PDS · ${application.applicant_number}`} />
      <p className="mt-3 text-sm text-muted">Version {versionNumber}. Print and have the applicant sign the required sections in person.</p>
    </div>
    <PrintablePdsDocument applicantNumber={application.applicant_number} draftData={pdsData} versionNumber={versionNumber} />
  </>;
}
