import Link from "next/link";
import { redirect } from "next/navigation";
import { HashtagIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { StartPdsUpdateButton } from "../pds/components/StartPdsUpdateButton";
import { ProfileDetails } from "./components/ProfileDetails";

export default async function ApplicantProfilePage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const { data: versions, error: versionsError } = await applicant.supabase
    .from("pds_versions")
    .select("id, status, version_no")
    .eq("applicant_id", applicant.applicant.id)
    .order("version_no", { ascending: false });

  const submitted = versions?.find((version) => version.status === "SUBMITTED");
  const draft = versions?.find((version) => version.status === "DRAFT");

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas px-4 py-6 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-8 lg:-mx-10 lg:px-10">
      <PageHeader
        actions={
          submitted ? (
            draft ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href="/applicant/pds"
              >
                Continue PDS update
              </Link>
            ) : (
              <StartPdsUpdateButton redirectToPds />
            )
          ) : undefined
        }
        description="This profile reflects your latest submitted Personal Data Sheet."
        eyebrow="Applicant workspace"
        title="My profile"
      />
      <div className="mx-auto mt-6 max-w-6xl">
        <SurfaceCard as="section" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-primary px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-light text-primary">
                <HashtagIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">Applicant number</p>
                <p className="mt-0.5 break-all font-[Bricolage_Grotesque] text-xl font-semibold tracking-wide text-ink">
                  {applicant.applicant.applicant_number}
                </p>
              </div>
            </div>
            {submitted && (
              <div className="flex items-center gap-3 border-t border-line-subtle pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <WorkflowStatusTag label="Submitted" status="SUBMITTED" />
                <div>
                  <p className="text-sm font-medium text-ink">
                    Personal Data Sheet
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Version {submitted.version_no}
                  </p>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        {versionsError ? (
          <div className="mt-6">
            <EmptyState
              description="Your saved PDS is unchanged. Refresh this page to try loading it again."
              title="Profile temporarily unavailable"
            />
          </div>
        ) : !submitted ? (
          <div className="mt-6">
            <EmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href="/applicant/pds"
                >
                  Complete your PDS
                </Link>
              }
              description="Submit your Personal Data Sheet to create your applicant profile."
              title="No submitted PDS yet"
            />
          </div>
        ) : (
          <ProfileContent
            applicant={applicant}
            hasDraft={Boolean(draft)}
            pdsVersionId={submitted.id}
            versionNumber={submitted.version_no}
          />
        )}
      </div>
    </div>
  );
}

async function ProfileContent({
  applicant,
  pdsVersionId,
  versionNumber,
  hasDraft,
}: {
  applicant: NonNullable<Awaited<ReturnType<typeof getApplicantContext>>>;
  pdsVersionId: string;
  versionNumber: number;
  hasDraft: boolean;
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
    <>
      <ProfileDetails
        addresses={addressesResult.data ?? []}
        childrenRecords={childrenResult.data ?? []}
        education={educationResult.data ?? []}
        eligibility={eligibilityResult.data ?? []}
        experience={experienceResult.data ?? []}
        family={familyResult.data}
        hasDraft={hasDraft}
        otherInfo={otherInfoResult.data ?? []}
        personal={personalResult.data}
        references={referencesResult.data ?? []}
        trainings={trainingsResult.data ?? []}
        voluntaryWork={voluntaryWorkResult.data ?? []}
        versionNumber={versionNumber}
      />
    </>
  );
}
