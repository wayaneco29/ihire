import { notFound, redirect } from "next/navigation";
import { TeachingAssessmentPage } from "../page";

export default async function TeachingAssessmentDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ applicantNumber?: string | string[]; date?: string | string[] }>;
}>) {
  const [{ applicationId }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) notFound();
  if (typeof query.applicantNumber !== "string") redirect("/evaluator/demo-teaching");
  return TeachingAssessmentPage({
    searchParams: Promise.resolve({ ...query, applicationId }),
    showSchedule: false,
  });
}
