"use server";

import { revalidatePath } from "next/cache";
import { getApplicantContext } from "@/lib/auth/server";

type ApplyResult =
  | { success: true; applicationId: string; alreadyApplied: boolean }
  | { success: false; message: string };

export async function applyToJob(
  jobId: string,
  positionId: string,
): Promise<ApplyResult> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return { success: false, message: "This job posting is not available." };
  }
  if (!/^[0-9a-f-]{36}$/i.test(positionId)) {
    return { success: false, message: "Choose a position included in this job posting." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Sign in as an applicant to apply." };
  }
  if (!applicant.profile.has_submitted_pds) {
    return { success: false, message: "Submit your PDS before applying to a job." };
  }

  const { data: job, error: jobError } = await applicant.supabase
    .from("job_postings")
    .select("id, status, deadline")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job || job.status !== "OPEN" || (job.deadline && Date.parse(job.deadline) <= Date.now())) {
    return { success: false, message: "This posting is closed or no longer accepting applications." };
  }

  const { data: existing, error: existingError } = await applicant.supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("applicant_id", applicant.applicant.id)
    .maybeSingle();
  if (existingError) {
    return { success: false, message: "We could not check your application. Please try again." };
  }
  if (existing) {
    return { success: true, applicationId: existing.id, alreadyApplied: true };
  }

  const { data: applicationId, error } = await applicant.supabase.rpc(
    "apply_to_job",
    {
      p_job_id: jobId,
      p_position_id: positionId,
    },
  );
  if (error || !applicationId) {
    const message =
      error?.code === "PGRST202"
        ? "The application service has not been updated yet. Please try again later or contact HR."
        : error?.message.includes(
              "Choose a position included in this job posting",
            )
          ? "That position is no longer available for this posting. Refresh and choose an available position."
          : error?.message.includes("The job is not open for applications")
            ? "This posting is closed or no longer accepting applications."
            : error?.message.includes("Submit a PDS before applying")
              ? "Submit your PDS before applying to a job."
              : "Your application could not be submitted. Please try again or contact HR.";
    return {
      success: false,
      message,
    };
  }

  revalidatePath("/applicant/jobs");
  revalidatePath(`/applicant/jobs/${jobId}`);
  revalidatePath("/applicant/applications");
  revalidatePath("/applicant/dashboard");
  return { success: true, applicationId, alreadyApplied: false };
}
