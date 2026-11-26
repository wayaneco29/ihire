import { redirect } from "next/navigation";
import { getAsdsContext } from "@/lib/auth/server";

export default async function AsdsDecisionHistoryPage() {
  const asds = await getAsdsContext();
  if (!asds) redirect("/");
  redirect("/asds/postings");
}
