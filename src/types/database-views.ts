import type { PublicEnums } from './database-enums';

export type PublicViews = {
    "v_anonymized_applicants": {
        Row: {
            "applicant_number": string;
            "application_id": string;
            "application_status": PublicEnums["application_status"];
            "applied_at": string;
            "education_levels": (string)[] | null;
            "experience_years": number | null;
            "job_id": string;
            "skills": (string)[] | null;
            "training_hours": number | null;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_credibility": {
        Row: {
            "applicant_number": string;
            "application_id": string;
            "education_levels": (string)[] | null;
            "experience_years": number | null;
            "job_id": string;
            "skills": (string)[] | null;
            "training_hours": number | null;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_documents": {
        Row: {
            "applicant_number": string;
            "application_id": string;
            "document_id": string;
            "document_status": PublicEnums["document_status"];
            "document_type": string;
            "job_id": string;
            "storage_key": string;
            "uploaded_at": string;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_questionnaire": {
        Row: {
            "answer": boolean;
            "applicant_number": string;
            "application_id": string;
            "job_id": string;
            "question_code": PublicEnums["question_code"];
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
};
