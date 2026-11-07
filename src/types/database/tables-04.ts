import type { PublicEnums } from '../database-enums';

export type PdsLearningDevelopmentTable = {
    Row: {
        "conducted_by": string | null;
        "date_from": string | null;
        "date_to": string | null;
        "hours": number | null;
        "id": string;
        "ld_type": string | null;
        "pds_version_id": string;
        "sort_order": number;
        "title": string;
    };
    ComputedFields: never;
    Insert: {
        "conducted_by"?: string | null;
        "date_from"?: string | null;
        "date_to"?: string | null;
        "hours"?: number | null;
        "id"?: string;
        "ld_type"?: string | null;
        "pds_version_id": string;
        "sort_order": number;
        "title": string;
    };
    Update: {
        "conducted_by"?: string | null;
        "date_from"?: string | null;
        "date_to"?: string | null;
        "hours"?: number | null;
        "id"?: string;
        "ld_type"?: string | null;
        "pds_version_id"?: string;
        "sort_order"?: number;
        "title"?: string;
    };
    Relationships: [
        {
            foreignKeyName: "pds_learning_development_pds_version_id_fkey";
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

export type PdsOtherInfoTable = {
    Row: {
        "category": PublicEnums["other_info_category"];
        "description": string;
        "id": string;
        "pds_version_id": string;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "category": PublicEnums["other_info_category"];
        "description": string;
        "id"?: string;
        "pds_version_id": string;
        "sort_order": number;
    };
    Update: {
        "category"?: PublicEnums["other_info_category"];
        "description"?: string;
        "id"?: string;
        "pds_version_id"?: string;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_other_info_pds_version_id_fkey";
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

export type PdsPersonalInfoTable = {
    Row: {
        "agency_employee_no": string | null;
        "blood_type": string | null;
        "citizenship": string;
        "civil_status": PublicEnums["civil_status"];
        "civil_status_other": string | null;
        "date_of_birth": string;
        "dual_citizenship_by": string | null;
        "dual_citizenship_country": string | null;
        "email": string;
        "first_name": string;
        "height_m": number | null;
        "middle_name": string | null;
        "mobile_no": string | null;
        "name_extension": string | null;
        "pagibig_no": string | null;
        "pds_version_id": string;
        "philhealth_no": string | null;
        "philsys_no": string | null;
        "place_of_birth": string;
        "sex_at_birth": string;
        "surname": string;
        "telephone_no": string | null;
        "tin_no": string | null;
        "umid_no": string | null;
        "weight_kg": number | null;
    };
    ComputedFields: never;
    Insert: {
        "agency_employee_no"?: string | null;
        "blood_type"?: string | null;
        "citizenship": string;
        "civil_status": PublicEnums["civil_status"];
        "civil_status_other"?: string | null;
        "date_of_birth": string;
        "dual_citizenship_by"?: string | null;
        "dual_citizenship_country"?: string | null;
        "email": string;
        "first_name": string;
        "height_m"?: number | null;
        "middle_name"?: string | null;
        "mobile_no"?: string | null;
        "name_extension"?: string | null;
        "pagibig_no"?: string | null;
        "pds_version_id": string;
        "philhealth_no"?: string | null;
        "philsys_no"?: string | null;
        "place_of_birth": string;
        "sex_at_birth": string;
        "surname": string;
        "telephone_no"?: string | null;
        "tin_no"?: string | null;
        "umid_no"?: string | null;
        "weight_kg"?: number | null;
    };
    Update: {
        "agency_employee_no"?: string | null;
        "blood_type"?: string | null;
        "citizenship"?: string;
        "civil_status"?: PublicEnums["civil_status"];
        "civil_status_other"?: string | null;
        "date_of_birth"?: string;
        "dual_citizenship_by"?: string | null;
        "dual_citizenship_country"?: string | null;
        "email"?: string;
        "first_name"?: string;
        "height_m"?: number | null;
        "middle_name"?: string | null;
        "mobile_no"?: string | null;
        "name_extension"?: string | null;
        "pagibig_no"?: string | null;
        "pds_version_id"?: string;
        "philhealth_no"?: string | null;
        "philsys_no"?: string | null;
        "place_of_birth"?: string;
        "sex_at_birth"?: string;
        "surname"?: string;
        "telephone_no"?: string | null;
        "tin_no"?: string | null;
        "umid_no"?: string | null;
        "weight_kg"?: number | null;
    };
    Relationships: [
        {
            foreignKeyName: "pds_personal_info_pds_version_id_fkey";
            columns: [
                "pds_version_id"
            ];
            isOneToOne: true;
            referencedRelation: "pds_versions";
            referencedColumns: [
                "id"
            ];
        }
    ];
};

export type PdsQuestionnaireTable = {
    Row: {
        "answer": boolean;
        "case_status": string | null;
        "date_filed": string | null;
        "details": string | null;
        "id": string;
        "id_no": string | null;
        "pds_version_id": string;
        "question_code": PublicEnums["question_code"];
    };
    ComputedFields: never;
    Insert: {
        "answer": boolean;
        "case_status"?: string | null;
        "date_filed"?: string | null;
        "details"?: string | null;
        "id"?: string;
        "id_no"?: string | null;
        "pds_version_id": string;
        "question_code": PublicEnums["question_code"];
    };
    Update: {
        "answer"?: boolean;
        "case_status"?: string | null;
        "date_filed"?: string | null;
        "details"?: string | null;
        "id"?: string;
        "id_no"?: string | null;
        "pds_version_id"?: string;
        "question_code"?: PublicEnums["question_code"];
    };
    Relationships: [
        {
            foreignKeyName: "pds_questionnaire_pds_version_id_fkey";
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

export type PdsReferencesTable = {
    Row: {
        "address": string;
        "contact": string;
        "id": string;
        "name": string;
        "pds_version_id": string;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "address": string;
        "contact": string;
        "id"?: string;
        "name": string;
        "pds_version_id": string;
        "sort_order": number;
    };
    Update: {
        "address"?: string;
        "contact"?: string;
        "id"?: string;
        "name"?: string;
        "pds_version_id"?: string;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_references_pds_version_id_fkey";
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

export type DatabaseTables04 = {
  "pds_learning_development": PdsLearningDevelopmentTable;
  "pds_other_info": PdsOtherInfoTable;
  "pds_personal_info": PdsPersonalInfoTable;
  "pds_questionnaire": PdsQuestionnaireTable;
  "pds_references": PdsReferencesTable;
};
