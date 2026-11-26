import { redirect } from "next/navigation";
import { StaffJobPostingApplicantsPage } from "@/components/application/StaffPostingWorkflowPages";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsPostingApplicantsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, sds] = await Promise.all([params, getSdsContext()]);
  if (!sds) redirect("/");
  return (
    <StaffJobPostingApplicantsPage
      basePath="/sds"
      postingId={id}
      supabase={sds.supabase}
      workspace="SDS"
    />
  );
}
