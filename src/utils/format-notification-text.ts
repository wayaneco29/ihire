const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  ASSESSMENT_SCHEDULED: "Assessment scheduled",
  CLOSED: "Closed",
  DRAFT: "Draft",
  FOR_RESUBMISSION: "Needs resubmission",
  FOR_REVIEW: "Under review",
  HIRED: "Hired",
  NOT_QUALIFIED: "Not qualified",
  OPEN: "Open",
  PENDING: "Pending",
  QUALIFIED: "Qualified",
  REJECTED: "Rejected",
  SUBMITTED: "Submitted",
  UNDER_EVALUATION: "Under evaluation",
  VERIFIED: "Verified",
};

const notificationStatusPattern = new RegExp(
  `(^|[^A-Z0-9_])(${Object.keys(NOTIFICATION_STATUS_LABELS).join("|")})(?=$|[^A-Z0-9_])`,
  "g",
);

export function formatNotificationText(text: string): string {
  return text.replace(
    notificationStatusPattern,
    (match, prefix: string, status: string) =>
      `${prefix}${NOTIFICATION_STATUS_LABELS[status] ?? match}`,
  );
}

export function getNotificationStatusMessage(
  type: string,
  body: string,
): { prefix: string; status: string } | null {
  const match = body.match(/status changed to ([A-Z_]+)\.?$/);
  if (!match || !NOTIFICATION_STATUS_LABELS[match[1]]) return null;

  if (type === "DOCUMENT_STATUS") {
    return {
      prefix: "A document is now",
      status: NOTIFICATION_STATUS_LABELS[match[1]],
    };
  }

  if (type === "APPLICATION_STATUS") {
    return {
      prefix: "Your application is now",
      status: NOTIFICATION_STATUS_LABELS[match[1]],
    };
  }

  return null;
}
