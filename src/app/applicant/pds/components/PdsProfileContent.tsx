import { EmptyState } from "@/components/ui/EmptyState";
import { getApplicantContext } from "@/lib/auth/server";
import { PdsProfileDetails } from "./PdsProfileDetails";

type ApplicantContext = NonNullable<
  Awaited<ReturnType<typeof getApplicantContext>>
>;

export async function PdsProfileContent({
  applicant,
  pdsVersionId,
}: {
  applicant: ApplicantContext;
  pdsVersionId: string;
}) {
  const [
    personalResult,
    familyResult,
    addressesResult,
    childrenResult,
    educationResult,
    eligibilityResult,
    experienceResult,
    voluntaryWorkResult,
    trainingsResult,
    otherInfoResult,
    referencesResult,
  ] = await Promise.all([
    applicant.supabase
      .from("pds_personal_info")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .maybeSingle(),
    applicant.supabase
      .from("pds_family_background")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .maybeSingle(),
    applicant.supabase
      .from("pds_addresses")
      .select("*")
      .eq("pds_version_id", pdsVersionId),
    applicant.supabase
      .from("pds_children")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_education")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_eligibility")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_work_experience")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_voluntary_work")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_learning_development")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_other_info")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    applicant.supabase
      .from("pds_references")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
  ]);

  const loadError =
    personalResult.error ||
    familyResult.error ||
    addressesResult.error ||
    childrenResult.error ||
    educationResult.error ||
    eligibilityResult.error ||
    experienceResult.error ||
    voluntaryWorkResult.error ||
    trainingsResult.error ||
    otherInfoResult.error ||
    referencesResult.error;

  if (loadError) {
    return (
      <div className="mt-7">
        <EmptyState
          description="Your submitted data has not been changed. Refresh to try again."
          title="Profile details could not be loaded"
        />
      </div>
    );
  }

  return (
    <PdsProfileDetails
      addresses={addressesResult.data ?? []}
      childrenRecords={childrenResult.data ?? []}
      education={educationResult.data ?? []}
      eligibility={eligibilityResult.data ?? []}
      experience={experienceResult.data ?? []}
      family={familyResult.data}
      otherInfo={otherInfoResult.data ?? []}
      personal={personalResult.data}
      references={referencesResult.data ?? []}
      trainings={trainingsResult.data ?? []}
      voluntaryWork={voluntaryWorkResult.data ?? []}
    />
  );
}
