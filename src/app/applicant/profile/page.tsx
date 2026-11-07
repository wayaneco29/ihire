import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <>
      <PageHeader
        description="This profile reflects your latest submitted Personal Data Sheet."
        eyebrow="Applicant workspace"
        title="My profile"
      />

      {submitted && (
        <div className="mt-5">
          {draft ? (
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark" href="/applicant/pds">
              Continue PDS update
            </Link>
          ) : <StartPdsUpdateButton redirectToPds />}
        </div>
      )}

      {versionsError ? (
        <div className="mt-7">
          <EmptyState
            description="Your saved PDS is unchanged. Refresh this page to try loading it again."
            title="Profile temporarily unavailable"
          />
        </div>
      ) : !submitted ? (
        <div className="mt-7">
          <EmptyState
            action={
              <Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark" href="/applicant/pds">
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
    </>
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
  const [personalResult, educationResult, experienceResult, trainingsResult, otherInfoResult] =
    await Promise.all([
      applicant.supabase
        .from("pds_personal_info")
        .select("*")
        .eq("pds_version_id", pdsVersionId)
        .maybeSingle(),
      applicant.supabase
        .from("pds_education")
        .select("*")
        .eq("pds_version_id", pdsVersionId)
        .order("sort_order"),
      applicant.supabase
        .from("pds_work_experience")
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
        .eq("category", "SKILL_HOBBY")
        .order("sort_order"),
    ]);

  const loadError =
    personalResult.error || educationResult.error || experienceResult.error ||
    trainingsResult.error || otherInfoResult.error;

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
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <WorkflowStatusTag status="SUBMITTED" />
        <span className="text-sm text-muted">PDS version {versionNumber}</span>
      </div>
      <ProfileDetails
        education={educationResult.data ?? []}
        experience={experienceResult.data ?? []}
        hasDraft={hasDraft}
        personal={personalResult.data}
        skills={otherInfoResult.data ?? []}
        trainings={trainingsResult.data ?? []}
        versionNumber={versionNumber}
      />
    </>
  );
}
