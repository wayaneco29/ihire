import { redirect } from "next/navigation";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsPdsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, asds] = await Promise.all([params, getAsdsContext()]);
  if (!asds) redirect("/");
  redirect(`/asds/applications/${id}/pds/download`);
}
