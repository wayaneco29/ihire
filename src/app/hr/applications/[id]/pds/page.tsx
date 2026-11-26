import { redirect } from "next/navigation";
import { getHrContext } from "@/lib/auth/server";

export default async function HrPdsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, hr] = await Promise.all([params, getHrContext()]);
  if (!hr) redirect("/");
  redirect(`/hr/applications/${id}/pds/download`);
}
