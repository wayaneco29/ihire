"use server";

import { revalidatePath } from "next/cache";
import { getHrContext } from "@/lib/auth/server";

export async function recordHiringDecision(applicationId: string) {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) {
    return { success: false, message: "This application is not available for a hiring decision." };
  }

  const { data: application, error: applicationError } = await hr.supabase
    .from("v_anonymized_applicants")
    .select("application_id, job_id, applicant_number, application_status")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (applicationError || !application) {
    return { success: false, message: "This application is no longer available." };
  }
  if (application.application_status !== "QUALIFIED") {
    return { success: false, message: "Only qualified applicants can be hired." };
  }

  const { data: hiringResult, error } = await hr.supabase.rpc("hire_qualified_applicant", {
    p_application_id: applicationId,
  });
  if (error) {
    const message = error.message.includes("All available slots")
      ? "All available slots have been filled."
      : error.message.includes("Hiring is available after intake closes")
        ? "Hiring is still on hold until intake is closed, all evaluations are complete, required documents are verified, and correction windows are resolved. Refresh the readiness checklist for current blockers."
        : error.message.includes("final decision") || error.code === "23505"
          ? "This application already has a final decision. Refresh the list."
          : "The hiring decision could not be saved. Refresh and try again.";
    return { success: false, message };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${application.job_id}`);
  revalidatePath("/applicant/applications");
  revalidatePath(`/applicant/applications/${applicationId}`);
  revalidatePath("/applicant/dashboard");
  return {
    success: true,
    message:
      hiringResult === "HIRED_AND_FILLED_SLOTS"
        ? `${application.applicant_number} hired. All slots are filled; the remaining qualified applicants are now marked Not Selected.`
        : `${application.applicant_number} hired. The applicant has been notified.`,
  };
}

export async function closePostingIntake(jobId: string) {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return { success: false, message: "This posting is not available." };
  }

  const { data, error } = await hr.supabase.rpc("close_job_posting_intake", {
    p_job_id: jobId,
  });

  if (error || !data) {
    return {
      success: false,
      message: error?.message.includes("Only your open postings")
        ? "This posting is no longer open or has a deadline. Refresh the page."
        : "The posting could not be closed. Refresh and try again.",
    };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${jobId}`);
  revalidatePath("/applicant/jobs");
  revalidatePath(`/applicant/jobs/${jobId}`);
  return { success: true, message: "Application intake is now closed." };
}
