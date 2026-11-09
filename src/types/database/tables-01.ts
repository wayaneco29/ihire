import type { PublicEnums } from '../database-enums';

export type ApplicantsTable = {
    Row: {
        "applicant_number": string;
        "created_at": string;
        "id": string;
        "profile_id": string;
    };
    ComputedFields: never;
    Insert: {
        "applicant_number": string;
        "created_at"?: string;
        "id"?: string;
        "profile_id": string;
    };
    Update: {
        "applicant_number"?: string;
        "created_at"?: string;
        "id"?: string;
        "profile_id"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "applicants_profile_id_fkey";
            columns: [
                "profile_id"
            ];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type ApplicationEvaluationsTable = {
    Row: {
        "application_id": string;
        "evaluated_at": string;
        "evaluator_id": string;
        "id": string;
        "remarks": string | null;
        "result": string;
    };
    ComputedFields: never;
    Insert: {
        "application_id": string;
        "evaluated_at"?: string;
        "evaluator_id": string;
        "id"?: string;
        "remarks"?: string | null;
        "result": string;
    };
    Update: {
        "application_id"?: string;
        "evaluated_at"?: string;
        "evaluator_id"?: string;
        "id"?: string;
        "remarks"?: string | null;
        "result"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "application_evaluations_application_id_fkey";
            columns: [
                "application_id"
            ];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "application_evaluations_application_id_fkey";
            columns: [
                "application_id"
            ];
            isOneToOne: false;
            referencedRelation: "v_anonymized_documents";
            referencedColumns: [
                "application_id"
            ];
        },
        {
            foreignKeyName: "application_evaluations_evaluator_id_fkey";
            columns: [
                "evaluator_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type ApplicationsTable = {
    Row: {
        "applicant_id": string;
        "applied_at": string;
        "id": string;
        "job_id": string;
        "pds_version_id": string;
        "position_id": string | null;
        "status": PublicEnums["application_status"];
    };
    ComputedFields: never;
    Insert: {
        "applicant_id": string;
        "applied_at"?: string;
        "id"?: string;
        "job_id": string;
        "pds_version_id": string;
        "position_id"?: string | null;
        "status"?: PublicEnums["application_status"];
    };
    Update: {
        "applicant_id"?: string;
        "applied_at"?: string;
        "id"?: string;
        "job_id"?: string;
        "pds_version_id"?: string;
        "position_id"?: string | null;
        "status"?: PublicEnums["application_status"];
    };
    Relationships: [
        {
            foreignKeyName: "applications_applicant_id_fkey";
            columns: [
                "applicant_id"
            ];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "applications_job_id_fkey";
            columns: [
                "job_id"
            ];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "applications_job_id_fkey";
            columns: [
                "job_id"
            ];
            isOneToOne: false;
            referencedRelation: "v_anonymized_documents";
            referencedColumns: [
                "job_id"
            ];
        },
        {
            foreignKeyName: "applications_pds_version_id_fkey";
            columns: [
                "pds_version_id"
            ];
            isOneToOne: false;
            referencedRelation: "pds_versions";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "applications_job_position_fkey";
            columns: [
                "job_id",
                "position_id"
            ];
            isOneToOne: false;
            referencedRelation: "job_posting_positions";
            referencedColumns: [
                "job_id",
                "position_id"
            ];
        }
    ];
};

export type DocumentReviewsTable = {
    Row: {
        "confirmed_total_units": number | null;
        "confirmed_training_hours": number | null;
        "document_id": string;
        "evaluator_id": string;
        "id": string;
        "remarks": string | null;
        "reviewed_at": string;
        "status": PublicEnums["document_status"];
    };
    ComputedFields: never;
    Insert: {
        "confirmed_total_units"?: number | null;
        "confirmed_training_hours"?: number | null;
        "document_id": string;
        "evaluator_id": string;
        "id"?: string;
        "remarks"?: string | null;
        "reviewed_at"?: string;
        "status": PublicEnums["document_status"];
    };
    Update: {
        "confirmed_total_units"?: number | null;
        "confirmed_training_hours"?: number | null;
        "document_id"?: string;
        "evaluator_id"?: string;
        "id"?: string;
        "remarks"?: string | null;
        "reviewed_at"?: string;
        "status"?: PublicEnums["document_status"];
    };
    Relationships: [
        {
            foreignKeyName: "document_reviews_document_id_fkey";
            columns: [
                "document_id"
            ];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "document_reviews_document_id_fkey";
            columns: [
                "document_id"
            ];
            isOneToOne: false;
            referencedRelation: "v_anonymized_documents";
            referencedColumns: [
                "document_id"
            ];
        },
        {
            foreignKeyName: "document_reviews_evaluator_id_fkey";
            columns: [
                "evaluator_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type DocumentTypesTable = {
    Row: {
        "created_at": string;
        "id": string;
        "is_required": boolean;
        "name": string;
    };
    ComputedFields: never;
    Insert: {
        "created_at"?: string;
        "id"?: string;
        "is_required"?: boolean;
        "name": string;
    };
    Update: {
        "created_at"?: string;
        "id"?: string;
        "is_required"?: boolean;
        "name"?: string;
    };
    Relationships: [
    ];
};

export type DatabaseTables01 = {
  "applicants": ApplicantsTable;
  "application_evaluations": ApplicationEvaluationsTable;
  "applications": ApplicationsTable;
  "document_reviews": DocumentReviewsTable;
  "document_types": DocumentTypesTable;
};
