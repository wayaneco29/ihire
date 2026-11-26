import { redirect } from "next/navigation";
import { StaffApplicationDetailPage } from "@/components/application/StaffApplicationPages";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, asds] = await Promise.all([params, getAsdsContext()]);
  if (!asds) redirect("/");
  return <StaffApplicationDetailPage applicationId={id} basePath="/asds" supabase={asds.supabase} canHire={false} />;
}
