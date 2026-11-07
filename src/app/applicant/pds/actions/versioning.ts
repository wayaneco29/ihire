"use server";

import { getApplicantContext } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import type { NavigationResult } from "../action-utils";

export async function createPdsUpdateDraft(): Promise<NavigationResult> {
  const applicant = await getApplicantContext();
  if (!applicant || !applicant.profile.has_submitted_pds) {
    return { success: false, message: "Submit a PDS before starting an update." };
  }

  const { data, error } = await applicant.supabase.rpc("clone_pds_version");
  if (error || !data) {
    return {
      success: false,
      message: "Your PDS update could not be started. Please try again.",
    };
  }

  revalidatePath("/applicant/pds");
  return { success: true, currentStep: 1 };
}
