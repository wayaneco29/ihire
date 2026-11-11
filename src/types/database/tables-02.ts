import type { PublicEnums } from '../database-enums';

export type DocumentsTable = {
    Row: {
        "applicant_id": string;
        "certificate_title": string | null;
        "current_highest_education_level": PublicEnums["education_level"] | null;
        "document_type_id": string;
        "file_path": string;
        "id": string;
        "ocr_confidence": number | null;
        "ocr_processed_at": string | null;
        "ocr_total_units": number | null;
        "ocr_training_hours": number | null;
        "pds_education_id": string | null;
        "pds_learning_development_id": string | null;
        "replaces_document_id": string | null;
        "status": PublicEnums["document_status"];
        "total_units": number | null;
        "training_hours": number | null;
        "uploaded_at": string;
        "version": number;
    };
    ComputedFields: never;
    Insert: {
        "applicant_id": string;
        "certificate_title"?: string | null;
        "current_highest_education_level"?: PublicEnums["education_level"] | null;
        "document_type_id": string;
        "file_path"?: string;
        "id"?: string;
        "ocr_confidence"?: number | null;
        "ocr_processed_at"?: string | null;
        "ocr_total_units"?: number | null;
        "ocr_training_hours"?: number | null;
        "pds_education_id"?: string | null;
        "pds_learning_development_id"?: string | null;
        "replaces_document_id"?: string | null;
        "status"?: PublicEnums["document_status"];
        "total_units"?: number | null;
        "training_hours"?: number | null;
        "uploaded_at"?: string;
        "version": number;
    };
    Update: {
        "applicant_id"?: string;
        "certificate_title"?: string | null;
        "current_highest_education_level"?: PublicEnums["education_level"] | null;
        "document_type_id"?: string;
        "file_path"?: string;
        "id"?: string;
        "ocr_confidence"?: number | null;
        "ocr_processed_at"?: string | null;
        "ocr_total_units"?: number | null;
        "ocr_training_hours"?: number | null;
        "pds_education_id"?: string | null;
        "pds_learning_development_id"?: string | null;
        "replaces_document_id"?: string | null;
        "status"?: PublicEnums["document_status"];
        "total_units"?: number | null;
        "training_hours"?: number | null;
        "uploaded_at"?: string;
        "version"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "documents_applicant_id_fkey";
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
            foreignKeyName: "documents_document_type_id_fkey";
            columns: [
                "document_type_id"
            ];
            isOneToOne: false;
            referencedRelation: "document_types";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "documents_pds_learning_development_id_fkey";
            columns: [
                "pds_learning_development_id"
            ];
            isOneToOne: false;
            referencedRelation: "pds_learning_development";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "documents_pds_education_id_fkey";
            columns: [
                "pds_education_id"
            ];
            isOneToOne: false;
            referencedRelation: "pds_education";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "documents_replaces_document_id_fkey";
            columns: [
                "replaces_document_id"
            ];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type HiringDecisionsTable = {
    Row: {
        "application_id": string;
        "decided_at": string;
        "decision": string;
        "hr_id": string;
        "id": string;
    };
    ComputedFields: never;
    Insert: {
        "application_id": string;
        "decided_at"?: string;
        "decision": string;
        "hr_id": string;
        "id"?: string;
    };
    Update: {
        "application_id"?: string;
        "decided_at"?: string;
        "decision"?: string;
        "hr_id"?: string;
        "id"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "hiring_decisions_application_id_fkey";
            columns: [
                "application_id"
            ];
            isOneToOne: true;
            referencedRelation: "applications";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "hiring_decisions_application_id_fkey";
            columns: [
                "application_id"
            ];
            isOneToOne: true;
            referencedRelation: "v_anonymized_documents";
            referencedColumns: [
                "application_id"
            ];
        },
        {
            foreignKeyName: "hiring_decisions_hr_id_fkey";
            columns: [
                "hr_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type InvitationsTable = {
    Row: {
        "accepted_at": string | null;
        "created_at": string;
        "email": string;
        "expires_at": string;
        "id": string;
        "invited_by": string;
        "revoked_at": string | null;
        "role": PublicEnums["user_role"];
        "token_hash": string;
    };
    ComputedFields: never;
    Insert: {
        "accepted_at"?: string | null;
        "created_at"?: string;
        "email": string;
        "expires_at": string;
        "id"?: string;
        "invited_by": string;
        "revoked_at"?: string | null;
        "role": PublicEnums["user_role"];
        "token_hash": string;
    };
    Update: {
        "accepted_at"?: string | null;
        "created_at"?: string;
        "email"?: string;
        "expires_at"?: string;
        "id"?: string;
        "invited_by"?: string;
        "revoked_at"?: string | null;
        "role"?: PublicEnums["user_role"];
        "token_hash"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: [
                "invited_by"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type JobPostingsTable = {
    Row: {
        "created_at": string;
        "deadline": string | null;
        "description": string;
        "hr_id": string;
        "id": string;
        "requirements": string | null;
        "slots": number;
        "status": PublicEnums["job_status"];
        "title": string;
        "updated_at": string;
    };
    ComputedFields: never;
    Insert: {
        "created_at"?: string;
        "deadline"?: string | null;
        "description": string;
        "hr_id": string;
        "id"?: string;
        "requirements"?: string | null;
        "slots": number;
        "status"?: PublicEnums["job_status"];
        "title": string;
        "updated_at"?: string;
    };
    Update: {
        "created_at"?: string;
        "deadline"?: string | null;
        "description"?: string;
        "hr_id"?: string;
        "id"?: string;
        "requirements"?: string | null;
        "slots"?: number;
        "status"?: PublicEnums["job_status"];
        "title"?: string;
        "updated_at"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "job_postings_hr_id_fkey";
            columns: [
                "hr_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type NotificationsTable = {
    Row: {
        "body": string;
        "created_at": string;
        "id": string;
        "is_read": boolean;
        "link": string | null;
        "title": string;
        "type": string;
        "user_id": string;
    };
    ComputedFields: never;
    Insert: {
        "body": string;
        "created_at"?: string;
        "id"?: string;
        "is_read"?: boolean;
        "link"?: string | null;
        "title": string;
        "type": string;
        "user_id": string;
    };
    Update: {
        "body"?: string;
        "created_at"?: string;
        "id"?: string;
        "is_read"?: boolean;
        "link"?: string | null;
        "title"?: string;
        "type"?: string;
        "user_id"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "notifications_user_id_fkey";
            columns: [
                "user_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type DatabaseTables02 = {
  "documents": DocumentsTable;
  "education_levels": EducationLevelsTable;
  "hiring_decisions": HiringDecisionsTable;
  "invitations": InvitationsTable;
  "job_postings": JobPostingsTable;
  "notifications": NotificationsTable;
};

export type EducationLevelsTable = {
  Row: {
    attainment_status: string | null;
    qualification_level: number;
    description: string;
    graduate_degree_type: string | null;
    maximum_units: number | null;
    minimum_units: number | null;
  };
  Insert: {
    attainment_status?: string | null;
    qualification_level: number;
    description: string;
    graduate_degree_type?: string | null;
    maximum_units?: number | null;
    minimum_units?: number | null;
  };
  Update: {
    attainment_status?: string | null;
    qualification_level?: number;
    description?: string;
    graduate_degree_type?: string | null;
    maximum_units?: number | null;
    minimum_units?: number | null;
  };
  Relationships: [];
};
