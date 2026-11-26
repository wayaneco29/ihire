import { redirect } from "next/navigation";
import { StaffApplicationDetailPage } from "@/components/application/StaffApplicationPages";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, sds] = await Promise.all([params, getSdsContext()]);
  if (!sds) redirect("/");
  return <StaffApplicationDetailPage applicationId={id} basePath="/sds" supabase={sds.supabase} canHire />;
}
