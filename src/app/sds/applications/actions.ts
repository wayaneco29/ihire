"use server";

import { revalidatePath } from "next/cache";
import { getSdsContext } from "@/lib/auth/server";

export async function hireApplicant(applicationId: string, remarks: string) {
  const sds = await getSdsContext();
  if (!sds) return { success: false, message: "SDS access is required." };
  if (
    !/^[0-9a-f-]{36}$/i.test(applicationId) ||
    typeof remarks !== "string" ||
    !remarks.trim() ||
    remarks.trim().length > 2000
  ) {
    return {
      success: false,
      message: "Add required remarks of up to 2,000 characters.",
    };
  }
  const { data: application, error: applicationError } = await sds.supabase
    .from("v_staff_application_reviews")
    .select("application_id, job_id, applicant_number, application_status")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (applicationError || !application)
    return {
      success: false,
      message: "This application is no longer available.",
    };
  if (application.application_status !== "QUALIFIED")
    return {
      success: false,
      message: "Only qualified applicants can be hired.",
    };

  const { data, error } = await sds.supabase.rpc("hire_qualified_applicant", {
    p_application_id: applicationId,
    p_remarks: remarks.trim(),
  });
  if (error) {
    if (error.code === "23514" && error.message.startsWith("Hiring blocked:")) {
      return { success: false, message: error.message };
    }
    const message = error.message.includes("Hiring is available")
      ? "Hiring is on hold until intake is closed and all application reviews, required document checks, and correction windows are resolved."
      : error.message.includes("All available slots")
        ? "All available slots have been filled."
        : error.message.includes("decision already") || error.code === "23505"
          ? "A decision already exists for this application. Refresh the page."
          : "The hiring decision could not be saved. Refresh and try again.";
    return { success: false, message };
  }
  revalidatePath("/sds/postings");
  revalidatePath(`/sds/postings/${application.job_id}`);
  revalidatePath("/sds/decisions");
  revalidatePath("/asds/postings");
  revalidatePath(`/asds/postings/${application.job_id}`);
  revalidatePath("/asds/decisions");
  revalidatePath("/sds/applications");
  revalidatePath(`/sds/applications/${applicationId}`);
  revalidatePath("/asds/applications");
  revalidatePath(`/asds/applications/${applicationId}`);
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${application.job_id}`);
  revalidatePath("/applicant/applications");
  revalidatePath(`/applicant/applications/${applicationId}`);
  revalidatePath("/applicant/dashboard");
  return {
    success: true,
    message:
      data === "HIRED_AND_FILLED_SLOTS"
        ? `${application.applicant_number} hired. All slots are filled.`
        : `${application.applicant_number} hired.`,
  };
}
