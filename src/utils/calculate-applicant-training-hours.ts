type TrainingRecord = {
  id: string;
  hours: number | null;
};

type TrainingCertificate = {
  id?: string;
  training_hours: number | null;
  pds_learning_development_id: string | null;
  replaces_document_id?: string | null;
};

export function calculateApplicantTrainingHours(
  trainingRecords: TrainingRecord[],
  certificates: TrainingCertificate[],
) {
  const replacedCertificateIds = new Set(
    certificates
      .map((certificate) => certificate.replaces_document_id)
      .filter((id): id is string => id !== null && id !== undefined),
  );
  const latestCertificateByTraining = new Map<string, number>();
  let unlinkedCertificateHours = 0;

  for (const certificate of certificates) {
    if (
      certificate.id &&
      replacedCertificateIds.has(certificate.id)
    ) {
      continue;
    }
    if (certificate.training_hours === null) continue;
    if (certificate.pds_learning_development_id === null) {
      unlinkedCertificateHours += certificate.training_hours;
    } else if (
      !latestCertificateByTraining.has(
        certificate.pds_learning_development_id,
      )
    ) {
      latestCertificateByTraining.set(
        certificate.pds_learning_development_id,
        certificate.training_hours,
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
