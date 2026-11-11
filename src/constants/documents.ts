export const TRAINING_CERTIFICATE_DOCUMENT_TYPE = "Training and Seminar Certificates";
export const TRANSCRIPT_DOCUMENT_TYPE = "Transcript of Records";

const SUPPORTING_DOCUMENT_GROUPS = [
  {
    label: "Education documents",
    types: [
      "Diploma or Certificate of Graduation",
      TRANSCRIPT_DOCUMENT_TYPE,
    ],
  },
  {
    label: "Eligibility and licenses",
    types: ["Eligibility or Professional License Certificate"],
  },
  {
    label: "Employment and service records",
    types: ["Certificate of Employment or Service Record"],
  },
  {
    label: "Training certificates",
    types: [TRAINING_CERTIFICATE_DOCUMENT_TYPE],
  },
  {
    label: "Other supporting documents",
    types: ["Other Supporting Document"],
  },
] as const;

export function groupSupportingDocuments<
  T extends { document_type: string },
>(documents: T[]) {
  const grouped = SUPPORTING_DOCUMENT_GROUPS.map(({ label, types }) => ({
    label,
    documents: types.flatMap((type) =>
      documents.filter((document) => document.document_type === type),
    ),
  })).filter((group) => group.documents.length > 0);
  const knownTypes = new Set<string>(
    SUPPORTING_DOCUMENT_GROUPS.flatMap(({ types }) => types),
  );
  const otherDocuments = documents.filter(
    (document) => !knownTypes.has(document.document_type),
  );

  if (otherDocuments.length) {
    const otherGroup = grouped.find(
      (group) => group.label === "Other supporting documents",
    );
    if (otherGroup) {
      otherGroup.documents.push(...otherDocuments);
    } else {
      grouped.push({
        label: "Other supporting documents",
        documents: otherDocuments,
      });
    }
  }

  return grouped;
}
