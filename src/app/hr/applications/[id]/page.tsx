import { redirect } from "next/navigation";
import { StaffApplicationDetailPage } from "@/components/application/StaffApplicationPages";
import { APPLICATION_STATUSES } from "@/constants/statuses";
import { getHrContext } from "@/lib/auth/server";

const RETURN_STATUS_OPTIONS = new Set<string>([
  "ALL",
  ...APPLICATION_STATUSES,
]);

export default async function HrApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ id }, query, hr] = await Promise.all([
    params,
    searchParams,
    getHrContext(),
  ]);
  if (!hr) redirect("/");

  const returnStatus =
    typeof query.returnStatus === "string" &&
    RETURN_STATUS_OPTIONS.has(query.returnStatus)
      ? query.returnStatus
      : "QUALIFIED";

  return (
    <StaffApplicationDetailPage
      applicationId={id}
      basePath="/hr"
      canHire={false}
      returnStatus={returnStatus}
      supabase={hr.supabase}
      workspace="HR"
    />
  );
}
