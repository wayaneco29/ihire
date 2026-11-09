"use client";

import { useState, useTransition } from "react";
import { Select } from "antd";
import { useRouter } from "next/navigation";
import type { Json } from "@/types/database";
import { setPdsWizardStep } from "../actions/navigation";
import { PersonalInformationStep } from "./steps/PersonalInformationStep";
import { FamilyBackgroundStep } from "./steps/FamilyBackgroundStep";
import { EducationStep } from "./steps/EducationStep";
import { EligibilityStep } from "./steps/EligibilityStep";
import { WorkExperienceStep } from "./steps/WorkExperienceStep";
import { VoluntaryWorkStep } from "./steps/VoluntaryWorkStep";
import { LearningDevelopmentStep } from "./steps/LearningDevelopmentStep";
import { OtherInformationStep } from "./steps/OtherInformationStep";
import { QuestionnaireStep } from "./steps/QuestionnaireStep";
import { ReferencesStep } from "./steps/ReferencesStep";
import { ReviewSubmitStep } from "./steps/ReviewSubmitStep";

const STEPS = [
  "Personal Information",
  "Family Background",
  "Educational Background",
  "Civil Service Eligibility",
  "Work Experience",
  "Voluntary Work",
  "Learning & Development",
  "Other Information",
  "Questionnaire",
  "References",
  "Review & Submit",
] as const;

type Props = {
  completedSteps: number[];
  currentStep: number;
  draftData: Json;
  pdsVersionId: string | null;
  previousSubmittedVersion: number | null;
  versionNumber: number;
};

export function PdsWizardShell({
  completedSteps: initialCompletedSteps,
  currentStep: initialStep,
  draftData,
  pdsVersionId,
  previousSubmittedVersion,
  versionNumber,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState(initialCompletedSteps);
  const [currentDraftData, setCurrentDraftData] = useState(draftData);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openStep(step: number) {
    if (!pdsVersionId || !completedSteps.includes(step) || isPending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await setPdsWizardStep(pdsVersionId, step);
      if (result.success) {
        setCurrentStep(result.currentStep);
      } else {
        setMessage(result.message);
      }
    });
  }

  function completeStep(nextStep: number, stepData: Json) {
    setCompletedSteps((steps) =>
      steps.includes(currentStep)
        ? steps
        : [...steps, currentStep].sort((left, right) => left - right),
    );
    setCurrentDraftData((value) => {
      const entries =
        value && typeof value === "object" && !Array.isArray(value)
          ? value
          : {};
      return { ...entries, [String(currentStep)]: stepData };
    });
    setCurrentStep(nextStep);
  }

  const activeStepName = STEPS[currentStep - 1] ?? STEPS[0];
  const savedSteps =
    currentDraftData &&
    typeof currentDraftData === "object" &&
    !Array.isArray(currentDraftData)
      ? Object.keys(currentDraftData)
      : [];

  return (
    <section className="mt-7 rounded-2xl border border-primary/15 bg-panel p-4 shadow-sm sm:p-6">
      {previousSubmittedVersion !== null && (
        <p className="mb-5 rounded-md border border-primary/20 bg-primary-light p-3 text-sm leading-6 text-primary-dark">
          Submitted version {previousSubmittedVersion} remains active for your
          applications until this update is submitted.
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Personal Data Sheet
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Step {currentStep} of {STEPS.length}: {activeStepName}
          </h2>
          <p className="mt-1 text-xs text-muted">PDS version {versionNumber}</p>
        </div>
        <p className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
          {completedSteps.length} of {STEPS.length} finished
        </p>
      </div>

      <nav aria-label="PDS steps" className="mb-7">
        <div className="mb-3 sm:hidden">
          <label className="sr-only" htmlFor="pds-mobile-step">
            Choose a completed PDS step
          </label>
          <Select
            className="w-full"
            disabled={isPending || !pdsVersionId}
            id="pds-mobile-step"
            onChange={openStep}
            options={STEPS.map((label, index) => {
              const step = index + 1;
              return {
                value: step,
                label: `${step}. ${label}`,
                disabled:
                  step !== currentStep && !completedSteps.includes(step),
              };
            })}
            value={currentStep}
          />
        </div>
        <ol className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {STEPS.map((label, index) => {
            const step = index + 1;
            const completed = completedSteps.includes(step);
            const active = currentStep === step;
            const canOpen = completed && !active && Boolean(pdsVersionId);

            return (
              <li key={label}>
                <button
                  aria-current={active ? "step" : undefined}
                  aria-disabled={!canOpen}
                  className={`flex min-h-14 w-full items-start gap-2 rounded-md border p-2.5 text-left text-xs transition sm:text-sm ${
                    active
                      ? "border-primary bg-primary-light text-primary-dark"
                      : completed
                        ? "border-primary/20 bg-panel text-ink hover:border-primary"
                        : "cursor-not-allowed border-line bg-panel-muted text-muted"
                  }`}
                  disabled={!canOpen || isPending}
                  onClick={() => openStep(step)}
                  type="button"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completed || active
                        ? "bg-primary text-on-primary"
                        : "bg-line text-muted"
                    }`}
                  >
                    {completed ? "✓" : step}
                  </span>
                  <span className="pt-0.5 leading-4">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div aria-live="polite" className="rounded-md bg-panel-muted p-4 sm:p-5">
        {message && (
          <p className="mb-3 text-sm text-danger" role="alert">
            {message}
          </p>
        )}
        {currentStep === 1 && pdsVersionId ? (
          <PersonalInformationStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 2 && pdsVersionId ? (
          <FamilyBackgroundStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 3 && pdsVersionId ? (
          <EducationStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 4 && pdsVersionId ? (
          <EligibilityStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 5 && pdsVersionId ? (
          <WorkExperienceStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 6 && pdsVersionId ? (
          <VoluntaryWorkStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 7 && pdsVersionId ? (
          <LearningDevelopmentStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 8 && pdsVersionId ? (
          <OtherInformationStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 9 && pdsVersionId ? (
          <QuestionnaireStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 10 && pdsVersionId ? (
          <ReferencesStep
            draftData={currentDraftData}
            onCompleted={completeStep}
            pdsVersionId={pdsVersionId}
          />
        ) : currentStep === 11 && pdsVersionId ? (
          <ReviewSubmitStep
            draftData={currentDraftData}
            onSubmitted={() => {
              setCompletedSteps((steps) =>
                steps.includes(11)
                  ? steps
                  : [...steps, 11].sort((a, b) => a - b),
              );
              router.push("/applicant/dashboard");
            }}
            pdsVersionId={pdsVersionId}
          />
        ) : (
          <p className="text-sm leading-6 text-muted">
            {savedSteps.includes(String(currentStep))
              ? "Your latest changes for this section are saved."
              : "Your changes for this section will be saved as you work."}
          </p>
        )}
      </div>
    </section>
  );
}
