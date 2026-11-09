"use client";

import { useState, useTransition } from "react";
import { Select } from "antd";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
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
  const progressPercent = Math.round(
    (completedSteps.length / STEPS.length) * 100,
  );
  const savedSteps =
    currentDraftData &&
    typeof currentDraftData === "object" &&
    !Array.isArray(currentDraftData)
      ? Object.keys(currentDraftData)
      : [];

  return (
    <SurfaceCard
      as="section"
      className="mt-7 rounded-2xl"
    >
      <nav
        aria-label="PDS sections"
        className="sticky top-header z-10 border-b border-line-subtle bg-panel-muted/95 px-5 py-4 backdrop-blur sm:px-7"
      >
        <div className="sm:hidden">
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
        <div className="hidden overflow-x-auto pb-2 sm:block">
          <ol className="flex min-w-[58rem] items-start">
            {STEPS.map((label, index) => {
              const step = index + 1;
              const completed = completedSteps.includes(step);
              const active = currentStep === step;
              const canOpen = completed && !active && Boolean(pdsVersionId);
              const progressPassed = completed || step < currentStep;

              return (
                <li
                  aria-current={active ? "step" : undefined}
                  className="relative flex min-w-0 flex-1 flex-col items-center px-1 text-center"
                  key={label}
                >
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 right-[-50%] top-4 h-0.5 ${
                        progressPassed ? "bg-primary" : "bg-line-strong"
                      }`}
                    />
                  )}
                  <button
                    aria-label={`${label}${active ? ", current section" : completed ? ", completed" : ", not yet available"}`}
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      active
                        ? "border-primary bg-primary text-on-primary ring-4 ring-primary-light"
                        : completed
                          ? "border-primary bg-primary text-on-primary hover:bg-primary-dark"
                          : "border-line-strong bg-panel text-muted"
                    } ${canOpen ? "cursor-pointer" : "cursor-default"}`}
                    disabled={!canOpen || isPending}
                    onClick={() => openStep(step)}
                    type="button"
                  >
                    {completed ? (
                      <CheckIcon aria-hidden="true" className="size-4" />
                    ) : (
                      step
                    )}
                  </button>
                  <span
                    className={`mt-2 max-w-20 text-[10px] leading-4 ${
                      active
                        ? "font-semibold text-primary-dark"
                        : completed
                          ? "font-medium text-ink"
                          : "text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      {previousSubmittedVersion !== null && (
        <div className="border-b border-primary/15 bg-primary-light/60 px-5 py-3.5 text-sm leading-6 text-ink sm:px-7">
          Submitted version {previousSubmittedVersion} remains active for your
          applications until this update is submitted.
        </div>
      )}
      <header className="px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">
              Personal Data Sheet · Version {versionNumber}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {activeStepName}
            </h2>
          </div>
          <p className="text-sm font-medium text-muted">
            <span className="font-semibold text-primary">
              {completedSteps.length} of {STEPS.length}
            </span>{" "}
            sections complete
          </p>
        </div>
        <div
          aria-label={`${progressPercent}% complete`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          className="mt-5 h-2 overflow-hidden rounded-full bg-panel-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div aria-live="polite" className="p-5 sm:p-7">
        {message && (
          <p className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
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
    </SurfaceCard>
  );
}
