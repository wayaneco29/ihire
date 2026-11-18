import type { PublicEnums } from '../database-enums';

export type ApplicantsTable = {
    Row: {
        "applicant_number": string;
        "created_at": string;
        "id": string;
        "profile_id": string;
        "qualification_level": number | null;
    };
    ComputedFields: never;
    Insert: {
        "applicant_number": string;
        "created_at"?: string;
        "id"?: string;
        "profile_id": string;
        "qualification_level"?: number | null;
    };
    Update: {
        "applicant_number"?: string;
        "created_at"?: string;
        "id"?: string;
        "profile_id"?: string;
        "qualification_level"?: number | null;
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
        },
        {
            foreignKeyName: "applicants_qualification_level_fkey";
            columns: [
                "qualification_level"
            ];
            isOneToOne: false;
            referencedRelation: "education_levels";
            referencedColumns: [
                "qualification_level"
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

export type ApplicationCriterionScoresTable = {
  Row: {
    application_id: string;
    criterion_id: string;
    created_at: string;
    evaluator_id: string;
    points: number;
    updated_at: string;
  };
  Insert: {
    application_id: string;
    criterion_id: string;
    created_at?: string;
    evaluator_id: string;
    points: number;
    updated_at?: string;
  };
  Update: {
    application_id?: string;
    criterion_id?: string;
    created_at?: string;
    evaluator_id?: string;
    points?: number;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "application_criterion_scores_application_id_fkey";
      columns: ["application_id"];
      isOneToOne: false;
      referencedRelation: "applications";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "application_criterion_scores_criterion_id_fkey";
      columns: ["criterion_id"];
      isOneToOne: false;
      referencedRelation: "position_criteria";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "application_criterion_scores_evaluator_id_fkey";
      columns: ["evaluator_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
  ];
};

export type ApplicationAssignmentHistoryTable = {
    Row: {
        "application_id": string;
        "assigned_at": string;
        "assigned_by": string | null;
        "assignment_source": string;
        "evaluator_id": string | null;
        "id": string;
        "previous_evaluator_id": string | null;
    };
    ComputedFields: never;
    Insert: {
        "application_id": string;
        "assigned_at"?: string;
        "assigned_by"?: string | null;
        "assignment_source": string;
        "evaluator_id"?: string | null;
        "id"?: string;
        "previous_evaluator_id"?: string | null;
    };
    Update: {
        "application_id"?: string;
        "assigned_at"?: string;
        "assigned_by"?: string | null;
        "assignment_source"?: string;
        "evaluator_id"?: string | null;
        "id"?: string;
        "previous_evaluator_id"?: string | null;
    };
    Relationships: [
        {
            foreignKeyName: "application_assignment_history_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
        },
        {
            foreignKeyName: "application_assignment_history_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
        },
        {
            foreignKeyName: "application_assignment_history_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
        },
        {
            foreignKeyName: "application_assignment_history_previous_evaluator_id_fkey";
            columns: ["previous_evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
        }
    ];
};

export type ApplicationsTable = {
    Row: {
        "applicant_id": string;
        "applied_at": string;
        "assigned_evaluator_id": string | null;
        "id": string;
        "job_id": string;
        "pds_version_id": string;
        "position_id": string | null;
        "scheduled_assessment_at": string | null;
        "status": PublicEnums["application_status"];
        "status_reason": string | null;
    };
    ComputedFields: never;
    Insert: {
        "applicant_id": string;
        "applied_at"?: string;
        "assigned_evaluator_id"?: string | null;
        "id"?: string;
        "job_id": string;
        "pds_version_id": string;
        "position_id"?: string | null;
        "scheduled_assessment_at"?: string | null;
        "status"?: PublicEnums["application_status"];
        "status_reason"?: string | null;
    };
    Update: {
        "applicant_id"?: string;
        "applied_at"?: string;
        "assigned_evaluator_id"?: string | null;
        "id"?: string;
        "job_id"?: string;
        "pds_version_id"?: string;
        "position_id"?: string | null;
        "scheduled_assessment_at"?: string | null;
        "status"?: PublicEnums["application_status"];
        "status_reason"?: string | null;
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
            foreignKeyName: "applications_assigned_evaluator_id_fkey";
            columns: ["assigned_evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
        "reviewer_id": string;
        "id": string;
        "remarks": string | null;
        "reviewed_at": string;
        "status": PublicEnums["document_status"];
        "resubmission_due_at": string | null;
        "resubmission_submitted_at": string | null;
        "resubmission_submitted_document_id": string | null;
    };
    ComputedFields: never;
    Insert: {
        "confirmed_total_units"?: number | null;
        "confirmed_training_hours"?: number | null;
        "document_id": string;
        "reviewer_id": string;
        "id"?: string;
        "remarks"?: string | null;
        "reviewed_at"?: string;
        "status": PublicEnums["document_status"];
        "resubmission_due_at"?: string | null;
        "resubmission_submitted_at"?: string | null;
        "resubmission_submitted_document_id"?: string | null;
    };
    Update: {
        "confirmed_total_units"?: number | null;
        "confirmed_training_hours"?: number | null;
        "document_id"?: string;
        "reviewer_id"?: string;
        "id"?: string;
        "remarks"?: string | null;
        "reviewed_at"?: string;
        "status"?: PublicEnums["document_status"];
        "resubmission_due_at"?: string | null;
        "resubmission_submitted_at"?: string | null;
        "resubmission_submitted_document_id"?: string | null;
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
            foreignKeyName: "document_reviews_reviewer_id_fkey";
            columns: [
                "reviewer_id"
            ];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "document_reviews_resubmission_submitted_document_id_fkey";
            columns: [
                "resubmission_submitted_document_id"
            ];
            isOneToOne: false;
            referencedRelation: "documents";
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
  "application_assignment_history": ApplicationAssignmentHistoryTable;
  "application_criterion_scores": ApplicationCriterionScoresTable;
  "application_evaluations": ApplicationEvaluationsTable;
  "applications": ApplicationsTable;
  "document_reviews": DocumentReviewsTable;
  "document_types": DocumentTypesTable;
};
