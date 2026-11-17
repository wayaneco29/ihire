import { getApplicantContext } from "@/lib/auth/server";
import { Buffer } from "node:buffer";
import { createPdsWorkbook } from "../../export-pds-workbook";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ versionId: string }> },
) {
  const applicant = await getApplicantContext();
  if (!applicant) return new Response("Unauthorized", { status: 401 });

  const { versionId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) {
    return new Response("PDS not found", { status: 404 });
  }

  const { data: version, error } = await applicant.supabase
    .from("pds_versions")
    .select("id, version_no")
    .eq("id", versionId)
    .eq("applicant_id", applicant.applicant.id)
    .eq("status", "SUBMITTED")
    .maybeSingle();

  if (error || !version) return new Response("PDS not found", { status: 404 });

  try {
    const workbook = await createPdsWorkbook(applicant.supabase, version.id);
    if (!workbook) {
      return new Response("PDS data could not be loaded", { status: 503 });
    }
    return new Response(Buffer.from(workbook), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="PDS-version-${version.version_no}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.log(error);
    return new Response("PDS export could not be generated", { status: 500 });
  }
}
