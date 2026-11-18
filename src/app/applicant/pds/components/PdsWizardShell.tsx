"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { ConfigProvider, Select } from "antd";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@heroicons/react/24/outline";
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

import { PdsFormNavigationContext, type SaveBeforeLeaving } from "./PdsForm";

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

  const saveBeforeLeaving = useRef<SaveBeforeLeaving | null>(null);
  const registerSave = useCallback((save: SaveBeforeLeaving | null) => {
    saveBeforeLeaving.current = save;
  }, []);
  const nextAvailableStep = Math.min(11, Math.max(0, ...completedSteps) + 1);

  function openStep(step: number) {
    if (
      !pdsVersionId ||
      step === currentStep ||
      (!completedSteps.includes(step) && step !== nextAvailableStep) ||
      isPending
    )
      return;
    setMessage(null);
    startTransition(async () => {
      const snapshot = await saveBeforeLeaving.current?.();
      if (snapshot === false) {
        setMessage(
          "Your changes are still saving or could not be saved. Please try again.",
        );
        return;
      }
      if (snapshot) {
        setCurrentDraftData((data) => ({
          ...(data && typeof data === "object" && !Array.isArray(data)
            ? data
            : {}),
          [String(currentStep)]: snapshot,
        }));
      }
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
    <ConfigProvider componentSize="large" componentDisabled={isPending}>
      <PdsFormNavigationContext.Provider value={registerSave}>
        <section className="relative min-h-[calc(100vh-4.5rem)] px-4 pb-28 pt-7 sm:-mx-6 sm:px-6 sm:pt-8 lg:-mx-10 lg:px-10">
          <div className="mx-auto grid w-full grid-cols-1 gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-10">
            <aside className="lg:sticky lg:top-24 lg:self-start rounded-sm bg-white p-4">
              <div className="mt-5 lg:hidden">
                <label className="sr-only" htmlFor="pds-mobile-step">
                  Choose a PDS section
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
                        step !== currentStep &&
                        step !== nextAvailableStep &&
                        !completedSteps.includes(step),
                    };
                  })}
                  value={currentStep}
                />
              </div>

              <nav aria-label="PDS sections" className="relative hidden lg:block">
                <span
                  aria-hidden="true"
                  className="absolute bottom-4 left-[0.8rem] top-4 w-px bg-line-strong"
                />
                <ol className="space-y-1">
                  {STEPS.map((label, index) => {
                    const step = index + 1;
                    const completed = completedSteps.includes(step);
                    const active = currentStep === step;
                    const canOpen =
                      !active &&
                      Boolean(pdsVersionId) &&
                      (completed || step === nextAvailableStep);

                    return (
                      <li aria-current={active ? "step" : undefined} key={label}>
                        <Button
                          aria-label={`${label}${active ? ", current section" : completed ? ", completed" : step === nextAvailableStep ? ", ready to continue" : ", not yet available"}`}
                          className={`relative flex min-h-8 w-full items-center gap-2.5 rounded-md px-0.5 text-left text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            active
                              ? "font-semibold text-primary-dark"
                              : completed
                                ? "font-medium text-ink hover:text-primary-dark"
                                : "text-muted cursor-not-allowed"
                          } ${canOpen ? "cursor-pointer" : "cursor-default"}`}
                          disabled={!canOpen || isPending}
                          onClick={() => openStep(step)}
                          type="button"
                          variant="unstyled"
                        >
                          <span
                            className={`relative z-10 grid size-[1.4rem] shrink-0 place-items-center rounded-full border bg-[#eaf1f1] text-[10px] ${
                              completed
                                ? "border-primary bg-primary text-on-primary"
                                : active
                                  ? "border-primary text-primary-dark ring-2 ring-primary-light"
                                  : "border-line-strong text-muted"
                            }`}
                          >
                            {completed ? (
                              <CheckIcon
                                aria-hidden="true"
                                className="size-3 stroke-2"
                              />
                            ) : (
                              step
                            )}
                          </span>
                          <span className="text-[10px]!">{label}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </aside>

            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted">
                  Personal Data Sheet · Version {versionNumber}
                </p>
                <div
                  aria-label={`${progressPercent}% complete`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progressPercent}
                  className="h-1.5 w-28 overflow-hidden rounded-full bg-panel/70"
                  role="progressbar"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {previousSubmittedVersion !== null && (
                <div className="mb-5 rounded-md border border-primary/15 bg-primary-light/70 px-4 py-3 text-xs leading-5 text-ink sm:text-sm">
                  Submitted version {previousSubmittedVersion} remains active
                  for your applications until this update is submitted.
                </div>
              )}
              {message && (
                <p
                  className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
                  role="alert"
                >
                  {message}
                </p>
              )}
              <div aria-live="polite" className="min-w-0">
                {currentStep === 1 && pdsVersionId ? (
                  <PersonalInformationStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 2 && pdsVersionId ? (
                  <FamilyBackgroundStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 3 && pdsVersionId ? (
                  <EducationStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 4 && pdsVersionId ? (
                  <EligibilityStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 5 && pdsVersionId ? (
                  <WorkExperienceStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 6 && pdsVersionId ? (
                  <VoluntaryWorkStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 7 && pdsVersionId ? (
                  <LearningDevelopmentStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 8 && pdsVersionId ? (
                  <OtherInformationStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 9 && pdsVersionId ? (
                  <QuestionnaireStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 10 && pdsVersionId ? (
                  <ReferencesStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onCompleted={completeStep}
                    pdsVersionId={pdsVersionId}
                  />
                ) : currentStep === 11 && pdsVersionId ? (
                  <ReviewSubmitStep
                    draftData={currentDraftData}
                    onBack={() => openStep(currentStep - 1)}
                    onEditSection={openStep}
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
            </div>
          </div>
        </section>
      </PdsFormNavigationContext.Provider>
    </ConfigProvider>
  );
}
