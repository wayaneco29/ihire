export type HiringReadiness = {
  intake_closed: boolean;
  pending_applications: number;
  pending_required_documents: number;
  pending_document_corrections: number;
  hired_count: number;
  slot_count: number;
  can_hire: boolean;
};

export function getHiringReadinessBlockers(
  readiness: HiringReadiness,
): string[] {
  const blockers: string[] = [];

  if (!readiness.intake_closed) {
    blockers.push(
      [
        "Close intake before hiring to stop new applications.",
        "Evaluations and document reviews can continue while intake is open.",
      ].join(" "),
    );
  }

  if (readiness.pending_applications > 0) {
    const count = readiness.pending_applications;
    blockers.push(
      count === 1
        ? "1 active application is awaiting evaluation."
        : `${count} active applications are awaiting evaluation.`,
    );
  }

  if (readiness.pending_required_documents > 0) {
    const count = readiness.pending_required_documents;
    blockers.push(
      count === 1
        ? "1 required document is awaiting verification."
        : `${count} required documents are awaiting verification.`,
    );
  }

  if (readiness.pending_document_corrections > 0) {
    const count = readiness.pending_document_corrections;
    blockers.push(
      count === 1
        ? "1 document correction window is still open."
        : `${count} document correction windows are still open.`,
    );
  }

  if (readiness.slot_count <= 0) {
    blockers.push("Add at least one hiring slot before hiring.");
  } else if (readiness.hired_count >= readiness.slot_count) {
    blockers.push("All hiring slots are filled.");
  }

  return blockers;
}
