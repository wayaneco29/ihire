import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getApplicantContext } from "@/lib/auth/server";
import { hydratePdsDraftData } from "./load-draft-data";
import { PdsWizardShell } from "./components/PdsWizardShell";
import { StartPdsUpdateButton } from "./components/StartPdsUpdateButton";
import { PdsProfileContent } from "./components/PdsProfileContent";
import type { Json } from "@/types/database";

function PdsUnavailable() {
  return (
    <>
      <PageHeader
        eyebrow="Applicant workspace"
        title="Personal Data Sheet"
        description="We could not load your saved PDS right now. Please try again."
      />
      <div className="mt-6">
        <EmptyState
          description="Your information remains private. Try refreshing this page."
          title="PDS unavailable"
        />
      </div>
    </>
  );
}

export default async function ApplicantPdsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const { data: versions, error } = await applicant.supabase
    .from("pds_versions")
    .select("id, status, current_step, completed_steps, version_no, draft_data")
    .eq("applicant_id", applicant.applicant.id)
    .order("version_no", { ascending: false });
  console.log(error);
  if (error) return <PdsUnavailable />;

  let draft = versions?.find((version) => version.status === "DRAFT") ?? null;
  const submitted = versions?.find((version) => version.status === "SUBMITTED");

  if (!draft && !submitted) {
    const { data: draftId, error: createError } = await applicant.supabase.rpc(
      "create_initial_pds_draft",
    );
    if (createError || !draftId) {
      return <PdsUnavailable />;
    }

    const { data: newDraft, error: loadError } = await applicant.supabase
      .from("pds_versions")
      .select(
        "id, status, current_step, completed_steps, version_no, draft_data",
      )
      .eq("id", draftId)
      .single();
    if (loadError || !newDraft) return <PdsUnavailable />;
    draft = newDraft;
  }

  let draftData: Json = draft?.draft_data ?? {};
  if (draft && submitted && draft.version_no > submitted.version_no) {
    const hydrated = await hydratePdsDraftData(
      applicant.supabase,
      draft.id,
      draft.draft_data,
    );
    if (!hydrated) return <PdsUnavailable />;
    draftData = hydrated;
  }

  return (
    <>
      <PageHeader
        actions={
          submitted ? (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-primary px-4 text-xs! font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href={`/applicant/pds/${submitted.id}/download`}
            >
              <ArrowDownTrayIcon aria-hidden="true" className="size-4" />
              Download PDS
            </Link>
          ) : undefined
        }
        title="Personal Data Sheet"
        description={
          draft
            ? "Complete your personal record section by section. Your draft saves as you go."
            : "Your Personal Data Sheet is submitted. Start an update whenever you are ready to make changes."
        }
      />
      {draft ? (
        <PdsWizardShell
          completedSteps={draft.completed_steps}
          currentStep={draft.current_step}
          draftData={draftData}
          pdsVersionId={draft.id}
          previousSubmittedVersion={submitted?.version_no ?? null}
          versionNumber={draft.version_no}
        />
      ) : (
        <>
          <SurfaceCard
            as="section"
            className="mt-7 overflow-hidden border-l-4 border-primary"
          >
            <div className="flex items-start gap-4 p-4 sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary-light text-primary">
                <CheckCircleIcon aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0 flex w-full gap-4 md:gap-8">
                <div className="flex-1">
                  <h2 className="font-[Bricolage_Grotesque] text-base font-semibold text-primary-dark">
                    Your PDS is submitted
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Version {submitted?.version_no} remains active for your
                    applications. Start an update when you’re ready to make
                    changes.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 flex-col">
                  <StartPdsUpdateButton className="mt-0" />
                </div>
              </div>
            </div>
          </SurfaceCard>
          {submitted && (
            <div className="mx-auto w-full">
              <PdsProfileContent
                applicant={applicant}
                pdsVersionId={submitted.id}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
