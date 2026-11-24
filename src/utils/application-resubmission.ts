const DOCUMENT_COMPLIANCE_REJECTION_PREFIX = 'Required document "';

export function isDocumentComplianceRejection(
  status: string,
  statusReason: string | null,
): boolean {
  return (
    status === "REJECTED" &&
    statusReason?.startsWith(DOCUMENT_COMPLIANCE_REJECTION_PREFIX) === true
  );
}
