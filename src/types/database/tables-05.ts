import type { PublicEnums } from '../database-enums';

export type PdsVersionsTable = {
    Row: {
        "applicant_id": string;
        "completed_steps": (number)[];
        "created_at": string;
        "current_step": number;
        "draft_data": import('../database-json').Json;
        "id": string;
        "status": PublicEnums["pds_status"];
        "submitted_at": string | null;
        "updated_at": string;
        "version_no": number;
    };
    ComputedFields: never;
    Insert: {
        "applicant_id": string;
        "completed_steps"?: (number)[];
        "created_at"?: string;
        "current_step"?: number;
        "draft_data"?: import('../database-json').Json;
        "id"?: string;
        "status"?: PublicEnums["pds_status"];
        "submitted_at"?: string | null;
        "updated_at"?: string;
        "version_no": number;
    };
    Update: {
        "applicant_id"?: string;
        "completed_steps"?: (number)[];
        "created_at"?: string;
        "current_step"?: number;
        "draft_data"?: import('../database-json').Json;
        "id"?: string;
        "status"?: PublicEnums["pds_status"];
        "submitted_at"?: string | null;
        "updated_at"?: string;
        "version_no"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_versions_applicant_id_fkey";
            columns: [
                "applicant_id"
            ];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type PdsVoluntaryWorkTable = {
    Row: {
        "date_from": string | null;
        "date_to": string | null;
        "hours": number | null;
        "id": string;
        "organization_name_address": string;
        "pds_version_id": string;
        "position_nature": string | null;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "date_from"?: string | null;
        "date_to"?: string | null;
        "hours"?: number | null;
        "id"?: string;
        "organization_name_address": string;
        "pds_version_id": string;
        "position_nature"?: string | null;
        "sort_order": number;
    };
    Update: {
        "date_from"?: string | null;
        "date_to"?: string | null;
        "hours"?: number | null;
        "id"?: string;
        "organization_name_address"?: string;
        "pds_version_id"?: string;
        "position_nature"?: string | null;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_voluntary_work_pds_version_id_fkey";
            columns: [
                "pds_version_id"
            ];
            isOneToOne: false;
            referencedRelation: "pds_versions";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type PdsWorkExperienceTable = {
    Row: {
        "agency_company": string;
        "appointment_status": string | null;
        "date_from": string;
        "date_to": string | null;
        "duties_description": string | null;
        "id": string;
        "is_gov_service": boolean;
        "monthly_salary": number | null;
        "pds_version_id": string;
        "position_title": string;
        "salary_grade_step": string | null;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "agency_company": string;
        "appointment_status"?: string | null;
        "date_from": string;
        "date_to"?: string | null;
        "duties_description"?: string | null;
        "id"?: string;
        "is_gov_service"?: boolean;
        "monthly_salary"?: number | null;
        "pds_version_id": string;
        "position_title": string;
        "salary_grade_step"?: string | null;
        "sort_order": number;
    };
    Update: {
        "agency_company"?: string;
        "appointment_status"?: string | null;
        "date_from"?: string;
        "date_to"?: string | null;
        "duties_description"?: string | null;
        "id"?: string;
        "is_gov_service"?: boolean;
        "monthly_salary"?: number | null;
        "pds_version_id"?: string;
        "position_title"?: string;
        "salary_grade_step"?: string | null;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_work_experience_pds_version_id_fkey";
            columns: [
                "pds_version_id"
            ];
            isOneToOne: false;
            referencedRelation: "pds_versions";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type ProfilesTable = {
    Row: {
        "created_at": string;
        "email": string;
        "has_submitted_pds": boolean;
        "id": string;
        "phone_number": string | null;
        "phone_verified_at": string | null;
        "role": PublicEnums["user_role"];
    };
    ComputedFields: never;
    Insert: {
        "created_at"?: string;
        "email": string;
        "has_submitted_pds"?: boolean;
        "id": string;
        "phone_number"?: string | null;
        "phone_verified_at"?: string | null;
        "role"?: PublicEnums["user_role"];
    };
    Update: {
        "created_at"?: string;
        "email"?: string;
        "has_submitted_pds"?: boolean;
        "id"?: string;
        "phone_number"?: string | null;
        "phone_verified_at"?: string | null;
        "role"?: PublicEnums["user_role"];
    };
    Relationships: [
    ];
};

export type DatabaseTables05 = {
  "pds_versions": PdsVersionsTable;
  "pds_voluntary_work": PdsVoluntaryWorkTable;
  "pds_work_experience": PdsWorkExperienceTable;
  "profiles": ProfilesTable;
};
