import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type NavigationResult =
  | { success: true; currentStep: number }
  | { success: false; message: string };

type PdsSupabaseClient = SupabaseClient<Database>;

export async function completeAndAdvanceStep(
  supabase: PdsSupabaseClient,
  pdsVersionId: string,
  step: number,
): Promise<NavigationResult> {
  const { data: completedAt, error: completeError } = await supabase.rpc(
    "complete_pds_step",
    { p_pds_version_id: pdsVersionId, p_step_number: step },
  );
  if (completeError || completedAt === null) {
    return {
      success: false,
      message: "Your information was saved, but this step could not be completed.",
    };
  }

  if (completedAt !== step || step === 11) {
    return { success: true, currentStep: completedAt };
  }

  const { data: nextStep, error: navigationError } = await supabase.rpc(
    "set_pds_current_step",
    { p_pds_version_id: pdsVersionId, p_step_number: step + 1 },
  );
  if (navigationError || nextStep === null) {
    return {
      success: false,
      message: "Your information was saved. Continue to the next section when ready.",
    };
  }
  return { success: true, currentStep: nextStep };
}
