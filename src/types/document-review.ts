export type ReviewerDocument = {
  documentId: string;
  documentType: string;
  documentStatus: string;
  uploadedAt: string;
  storageKey: string;
  isRequired: boolean;
  version: number;
  certificateTitle: string | null;
  certificateType: string | null;
  certificateIssuer: string | null;
  certificateDate: string | null;
  trainingHours: number | null;
  totalUnits: number | null;
  currentHighestEducationLevel: string | null;
  ocrTrainingHours: number | null;
  ocrTotalUnits: number | null;
  ocrConfidence: number | null;
  previousReview: {
    status: string;
    remarks: string | null;
    reviewed_at: string;
    confirmed_training_hours: number | null;
    confirmed_total_units: number | null;
  } | null;
};
