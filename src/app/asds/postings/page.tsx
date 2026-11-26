import { redirect } from "next/navigation";
import { StaffJobPostingsPage } from "@/components/application/StaffPostingWorkflowPages";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsPostingsPage() {
  const asds = await getAsdsContext();
  if (!asds) redirect("/");
  return <StaffJobPostingsPage basePath="/asds" supabase={asds.supabase} workspace="ASDS" />;
}
