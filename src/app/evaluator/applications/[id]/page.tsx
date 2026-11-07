import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { ApplicationEvaluationPanel } from "../components/ApplicationEvaluationPanel";
import { AnonymizedApplicantReview } from "./components/AnonymizedApplicantReview";

export default async function EvaluatorApplicationReviewPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select("application_id, applicant_number, application_status, job_id, education_levels, experience_years, training_hours, skills")
    .eq("application_id", id)
    .maybeSingle();

  if (error) {
    return (
      <EmptyState
        description="Refresh the page to try loading anonymized applicant information again."
        title="Applicant review unavailable"
      />
    );
  }
  if (!application) notFound();

  const [jobResult, questionnaireResult, documentsResult, evaluationResult] = await Promise.all([
    evaluator.supabase
      .from("job_postings")
      .select("title")
      .eq("id", application.job_id)
      .maybeSingle(),
    evaluator.supabase
      .from("v_anonymized_questionnaire")
      .select("question_code, answer")
      .eq("application_id", id),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("document_id, document_type, document_status, uploaded_at")
      .eq("application_id", id)
      .order("uploaded_at", { ascending: false }),
    evaluator.supabase
      .from("application_evaluations")
      .select("result, remarks, evaluated_at")
      .eq("application_id", id)
      .eq("evaluator_id", evaluator.user.id)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (questionnaireResult.error || documentsResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading this applicant’s review sections again."
        title="Review information unavailable"
      />
    );
  }

  return (
    <>
      <PageHeader
        description={jobResult.data?.title ?? "Application review"}
        eyebrow="Anonymized applicant review"
        title={application.applicant_number}
      />
      <AnonymizedApplicantReview
        applicantNumber={application.applicant_number}
        applicationStatus={application.application_status}
        documents={documentsResult.data ?? []}
        educationLevels={application.education_levels}
        experienceYears={application.experience_years}
        jobTitle={jobResult.data?.title ?? "Job posting"}
        questionnaire={questionnaireResult.data ?? []}
        skills={application.skills}
        trainingHours={application.training_hours}
      />
      <div className="mt-5">
        <ApplicationEvaluationPanel
          applicationId={id}
          applicationStatus={application.application_status}
          previousEvaluation={evaluationResult.data ?? null}
        />
      </div>
      <Link className="mt-5 inline-flex text-sm font-semibold text-primary hover:text-primary-dark" href="/evaluator/reviews">
        Back to review queue
      </Link>
    </>
  );
}
