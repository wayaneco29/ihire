import { redirect } from "next/navigation";
import { StaffJobPostingApplicantsPage } from "@/components/application/StaffPostingWorkflowPages";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsPostingApplicantsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, asds] = await Promise.all([params, getAsdsContext()]);
  if (!asds) redirect("/");
  return (
    <StaffJobPostingApplicantsPage
      basePath="/asds"
      postingId={id}
      supabase={asds.supabase}
      workspace="ASDS"
    />
  );
}
