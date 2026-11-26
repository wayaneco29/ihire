import { redirect } from "next/navigation";
import { StaffJobPostingsPage } from "@/components/application/StaffPostingWorkflowPages";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsPostingsPage() {
  const sds = await getSdsContext();
  if (!sds) redirect("/");
  return <StaffJobPostingsPage basePath="/sds" supabase={sds.supabase} workspace="SDS" />;
}
