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
            "position_title": string | null;
            "position_track": string | null;
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
            "total_units": number | null;
            "training_hours": number | null;
            "uploaded_at": string;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_document_metrics": {
        Row: {
            "document_id": string;
            "ocr_confidence": number | null;
            "ocr_processed_at": string | null;
            "ocr_total_units": number | null;
            "ocr_training_hours": number | null;
            "total_units": number | null;
            "training_hours": number | null;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_education": {
        Row: {
            "application_id": string;
            "degree_course": string | null;
            "education_id": string;
            "graduate_degree_completed": boolean | null;
            "graduate_degree_type": string | null;
            "graduate_units_earned": number | null;
            "highest_level_units_earned": string | null;
            "honors_received": string | null;
            "level": string;
            "period_from": number | null;
            "period_to": number | null;
            "qualification_description": string | null;
            "qualification_level": number | null;
            "school_name": string | null;
            "sort_order": number;
            "year_graduated": number | null;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_application_education_points": {
        Row: {
            "applicant_qualification_level": number | null;
            "application_id": string;
            "base_qualification_level": number | null;
            "education_points": number | null;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
    "v_anonymized_application_training_points": {
        Row: {
            "applicant_training_increment_level": number | null;
            "application_id": string;
            "maximum_training_points": number | null;
            "minimum_training_increment_level": number | null;
            "training_hours": number | null;
            "training_points": number | null;
        };
        Relationships: [];
    };
    "v_anonymized_application_experience_standards": {
        Row: {
            "application_id": string;
            "maximum_experience_points": number | null;
            "minimum_experience_increment_level": number | null;
            "position_id": string | null;
        };
        Relationships: [];
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
    "v_anonymized_work_experience": {
        Row: {
            "agency_company": string;
            "application_id": string;
            "appointment_status": string | null;
            "date_from": string;
            "date_to": string | null;
            "duties_description": string | null;
            "experience_id": string;
            "is_gov_service": boolean;
            "position_title": string;
            "sort_order": number;
        };
        ComputedFields: never;
        Relationships: [
        ];
    };
};
