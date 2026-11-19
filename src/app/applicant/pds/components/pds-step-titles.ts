export const PDS_STEP_TITLES = [
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

export const PDS_DATA_STEP_TITLES = PDS_STEP_TITLES.slice(0, -1);
