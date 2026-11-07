import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { hydratePdsDraftData } from "./load-draft-data";
import { PdsWizardShell } from "./components/PdsWizardShell";
import { StartPdsUpdateButton } from "./components/StartPdsUpdateButton";
import type { Json } from "@/types/database";

function PdsUnavailable() {
  return (
    <>
      <PageHeader
        eyebrow="Applicant workspace"
        title="Personal Data Sheet"
        description="We could not load your saved PDS right now. Please try again."
      />
      <div className="mt-7">
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

  if (error) {
    return <PdsUnavailable />;
  }

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
      .select("id, status, current_step, completed_steps, version_no, draft_data")
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
        eyebrow="Applicant workspace"
        title="Personal Data Sheet"
        description="Complete each section in order. Your draft is saved as you go."
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
        <section className="mt-7 rounded-2xl border border-primary/15 bg-panel p-5 sm:p-6">
          <p className="text-sm leading-6 text-muted">
            PDS version {submitted?.version_no} is submitted. It remains the active version for your applications until you submit an update.
          </p>
          <StartPdsUpdateButton />
          <Link
            className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
            href="/applicant/dashboard"
          >
            Go to dashboard
          </Link>
        </section>
      )}
    </>
  );
}
