const STATUS_DESCRIPTIONS: Record<string, string> = {
  SUBMITTED: "The application was received and is waiting for evaluator review.",
  UNDER_EVALUATION: "An evaluator is reviewing this application.",
  ASSESSMENT_SCHEDULED: "An assessment has been scheduled for this applicant.",
  QUALIFIED: "The evaluator qualified this applicant. HR can review the ranking and hiring readiness.",
  NOT_QUALIFIED: "The evaluator did not qualify this applicant for the next stage.",
  HIRED: "This applicant has been hired. Their printable PDS is available to HR.",
  NOT_SELECTED: "A final hiring decision was recorded and this applicant was not selected.",
  REJECTED: "This application was rejected.",
};

export function getHrApplicationStatusDescription(status: string) {
  return (
    STATUS_DESCRIPTIONS[status] ??
    "The application status is available in the posting workspace."
  );
}
