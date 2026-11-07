"use server";

import { revalidatePath } from "next/cache";
import { getHrContext } from "@/lib/auth/server";

export async function recordHiringDecision(
  applicationId: string,
  decision: "HIRED" | "REJECTED",
) {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !["HIRED", "REJECTED"].includes(decision)) {
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
  if (decision === "HIRED" && application.application_status !== "QUALIFIED") {
    return { success: false, message: "Only qualified applicants can be hired." };
  }
  if (decision === "REJECTED" && !["QUALIFIED", "NOT_QUALIFIED"].includes(application.application_status)) {
    return { success: false, message: "The application must be evaluated before a decision is recorded." };
  }

  const { error } = await hr.supabase.rpc("record_hr_hiring_decision", {
    target_application_id: applicationId,
    target_decision: decision,
  });
  if (error) {
    const message = error.message.includes("All available slots")
      ? "All available slots have been filled."
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
  return { success: true, message: `${application.applicant_number} marked ${decision === "HIRED" ? "hired" : "rejected"}. The applicant has been notified.` };
}
