type TrainingRecord = {
  id: string;
  hours: number | null;
};

type TrainingCertificate = {
  id?: string;
  ocr_training_hours?: number | null;
  training_hours: number | null;
  pds_learning_development_id: string | null;
  replaces_document_id?: string | null;
};

type TrainingReview = {
  id: string;
  document_id: string;
  status: string;
  confirmed_training_hours: number | null;
  reviewed_at: string;
};

export function calculateApplicantTrainingHours(
  trainingRecords: TrainingRecord[],
  certificates: TrainingCertificate[],
  reviews: TrainingReview[] = [],
) {
  const replacedCertificateIds = new Set(
    certificates
      .map((certificate) => certificate.replaces_document_id)
      .filter((id): id is string => id !== null && id !== undefined),
  );
  const latestReviewByDocument = new Map<string, TrainingReview>();
  for (const review of reviews) {
    const latestReview = latestReviewByDocument.get(review.document_id);
    if (
      !latestReview ||
      review.reviewed_at > latestReview.reviewed_at ||
      (review.reviewed_at === latestReview.reviewed_at &&
        review.id > latestReview.id)
    ) {
      latestReviewByDocument.set(review.document_id, review);
    }
  }
  const latestCertificateByTraining = new Map<string, number>();
  let unlinkedCertificateHours = 0;

  for (const certificate of certificates) {
    if (
      certificate.id &&
      replacedCertificateIds.has(certificate.id)
    ) {
      continue;
    }
    const latestReview = certificate.id
      ? latestReviewByDocument.get(certificate.id)
      : undefined;
    const trainingHours =
      (latestReview?.status === "VERIFIED"
        ? latestReview.confirmed_training_hours
        : null) ??
      certificate.training_hours ??
      certificate.ocr_training_hours ??
      null;
    if (trainingHours === null) continue;
    if (certificate.pds_learning_development_id === null) {
      unlinkedCertificateHours += trainingHours;
    } else if (
      !latestCertificateByTraining.has(
        certificate.pds_learning_development_id,
      )
    ) {
      latestCertificateByTraining.set(
        certificate.pds_learning_development_id,
        trainingHours,
      );
    }
  }

  return (
    trainingRecords.reduce(
      (total, training) =>
        total +
        (latestCertificateByTraining.get(training.id) ?? training.hours ?? 0),
      0,
    ) + unlinkedCertificateHours
  );
}
