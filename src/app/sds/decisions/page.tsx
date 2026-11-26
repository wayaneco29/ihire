import { redirect } from "next/navigation";
import { StaffDecisionHistoryPage } from "@/components/application/StaffPostingWorkflowPages";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsDecisionHistoryPage() {
  const sds = await getSdsContext();
  if (!sds) redirect("/");
  return <StaffDecisionHistoryPage basePath="/sds" supabase={sds.supabase} workspace="SDS" />;
}
