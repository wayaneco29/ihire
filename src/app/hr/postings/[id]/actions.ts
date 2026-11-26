"use server";

import { revalidatePath } from "next/cache";
import { getHrContext } from "@/lib/auth/server";

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
