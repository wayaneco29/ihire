import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPdsWorkbook } from "@/app/applicant/pds/export-pds-workbook";
import { pdsWorkbookDownloadResponse } from "@/lib/pds/download-response";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type StaffSupabase = SupabaseClient<Database>;

export async function downloadStaffApplicationPds(
  supabase: StaffSupabase,
  applicationId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) {
    return new Response("PDS not found", { status: 404 });
  }

  // Use the signed-in staff client's access-controlled view before the
  // service-role client reads the applicant's private PDS records.
  const { data: application, error: accessError } = await supabase
    .from("v_staff_application_reviews")
    .select("application_id, pds_version_id")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (accessError || !application) {
    return new Response("PDS not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: version, error: versionError } = await admin
    .from("pds_versions")
    .select("id, version_no")
    .eq("id", application.pds_version_id)
    .eq("status", "SUBMITTED")
    .maybeSingle();

  if (versionError) {
    return new Response("PDS data could not be loaded", { status: 503 });
  }
  if (!version) return new Response("PDS not found", { status: 404 });

  try {
    const workbook = await createPdsWorkbook(admin, version.id);
    if (!workbook) {
      return new Response("PDS data could not be loaded", { status: 503 });
    }

    return pdsWorkbookDownloadResponse(workbook, version.version_no);
  } catch {
    return new Response("PDS export could not be generated", { status: 500 });
  }
}
