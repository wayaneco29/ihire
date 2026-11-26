import { redirect } from "next/navigation";
import { getSdsContext } from "@/lib/auth/server";

export default async function SdsPdsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, sds] = await Promise.all([params, getSdsContext()]);
  if (!sds) redirect("/");
  redirect(`/sds/applications/${id}/pds/download`);
}
