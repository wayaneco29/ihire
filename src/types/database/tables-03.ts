import type { PublicEnums } from '../database-enums';

export type PdsAddressesTable = {
    Row: {
        "barangay": string | null;
        "city_municipality": string | null;
        "house_block_lot_no": string | null;
        "pds_version_id": string;
        "province": string | null;
        "same_as_residential": boolean;
        "street": string | null;
        "subdivision_village": string | null;
        "type": string;
        "zip_code": string | null;
    };
    ComputedFields: never;
    Insert: {
        "barangay"?: string | null;
        "city_municipality"?: string | null;
        "house_block_lot_no"?: string | null;
        "pds_version_id": string;
        "province"?: string | null;
        "same_as_residential"?: boolean;
        "street"?: string | null;
        "subdivision_village"?: string | null;
        "type": string;
        "zip_code"?: string | null;
    };
    Update: {
        "barangay"?: string | null;
        "city_municipality"?: string | null;
        "house_block_lot_no"?: string | null;
        "pds_version_id"?: string;
        "province"?: string | null;
        "same_as_residential"?: boolean;
        "street"?: string | null;
        "subdivision_village"?: string | null;
        "type"?: string;
        "zip_code"?: string | null;
    };
    Relationships: [
        {
            foreignKeyName: "pds_addresses_pds_version_id_fkey";
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

export type PdsChildrenTable = {
    Row: {
        "date_of_birth": string | null;
        "full_name": string;
        "id": string;
        "pds_version_id": string;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "date_of_birth"?: string | null;
        "full_name": string;
        "id"?: string;
        "pds_version_id": string;
        "sort_order": number;
    };
    Update: {
        "date_of_birth"?: string | null;
        "full_name"?: string;
        "id"?: string;
        "pds_version_id"?: string;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_children_pds_version_id_fkey";
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

export type PdsEducationTable = {
    Row: {
        "degree_course": string | null;
        "highest_level_units_earned": string | null;
        "honors_received": string | null;
        "id": string;
        "level": PublicEnums["education_level"];
        "pds_version_id": string;
        "period_from": number | null;
        "period_to": number | null;
        "school_name": string | null;
        "sort_order": number;
        "year_graduated": number | null;
    };
    ComputedFields: never;
    Insert: {
        "degree_course"?: string | null;
        "highest_level_units_earned"?: string | null;
        "honors_received"?: string | null;
        "id"?: string;
        "level": PublicEnums["education_level"];
        "pds_version_id": string;
        "period_from"?: number | null;
        "period_to"?: number | null;
        "school_name"?: string | null;
        "sort_order": number;
        "year_graduated"?: number | null;
    };
    Update: {
        "degree_course"?: string | null;
        "highest_level_units_earned"?: string | null;
        "honors_received"?: string | null;
        "id"?: string;
        "level"?: PublicEnums["education_level"];
        "pds_version_id"?: string;
        "period_from"?: number | null;
        "period_to"?: number | null;
        "school_name"?: string | null;
        "sort_order"?: number;
        "year_graduated"?: number | null;
    };
    Relationships: [
        {
            foreignKeyName: "pds_education_pds_version_id_fkey";
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

export type PdsEligibilityTable = {
    Row: {
        "eligibility_name": string;
        "exam_date": string | null;
        "exam_place": string | null;
        "id": string;
        "license_no": string | null;
        "license_valid_until": string | null;
        "pds_version_id": string;
        "rating": number | null;
        "sort_order": number;
    };
    ComputedFields: never;
    Insert: {
        "eligibility_name": string;
        "exam_date"?: string | null;
        "exam_place"?: string | null;
        "id"?: string;
        "license_no"?: string | null;
        "license_valid_until"?: string | null;
        "pds_version_id": string;
        "rating"?: number | null;
        "sort_order": number;
    };
    Update: {
        "eligibility_name"?: string;
        "exam_date"?: string | null;
        "exam_place"?: string | null;
        "id"?: string;
        "license_no"?: string | null;
        "license_valid_until"?: string | null;
        "pds_version_id"?: string;
        "rating"?: number | null;
        "sort_order"?: number;
    };
    Relationships: [
        {
            foreignKeyName: "pds_eligibility_pds_version_id_fkey";
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

export type PdsFamilyBackgroundTable = {
    Row: {
        "father_first_name": string | null;
        "father_middle_name": string | null;
        "father_name_extension": string | null;
        "father_surname": string | null;
        "mother_first_name": string | null;
        "mother_middle_name": string | null;
        "mother_surname": string | null;
        "pds_version_id": string;
        "spouse_business_address": string | null;
        "spouse_employer": string | null;
        "spouse_first_name": string | null;
        "spouse_middle_name": string | null;
        "spouse_name_extension": string | null;
        "spouse_occupation": string | null;
        "spouse_surname": string | null;
        "spouse_telephone_no": string | null;
    };
    ComputedFields: never;
    Insert: {
        "father_first_name"?: string | null;
        "father_middle_name"?: string | null;
        "father_name_extension"?: string | null;
        "father_surname"?: string | null;
        "mother_first_name"?: string | null;
        "mother_middle_name"?: string | null;
        "mother_surname"?: string | null;
        "pds_version_id": string;
        "spouse_business_address"?: string | null;
        "spouse_employer"?: string | null;
        "spouse_first_name"?: string | null;
        "spouse_middle_name"?: string | null;
        "spouse_name_extension"?: string | null;
        "spouse_occupation"?: string | null;
        "spouse_surname"?: string | null;
        "spouse_telephone_no"?: string | null;
    };
    Update: {
        "father_first_name"?: string | null;
        "father_middle_name"?: string | null;
        "father_name_extension"?: string | null;
        "father_surname"?: string | null;
        "mother_first_name"?: string | null;
        "mother_middle_name"?: string | null;
        "mother_surname"?: string | null;
        "pds_version_id"?: string;
        "spouse_business_address"?: string | null;
        "spouse_employer"?: string | null;
        "spouse_first_name"?: string | null;
        "spouse_middle_name"?: string | null;
        "spouse_name_extension"?: string | null;
        "spouse_occupation"?: string | null;
        "spouse_surname"?: string | null;
        "spouse_telephone_no"?: string | null;
    };
    Relationships: [
        {
            foreignKeyName: "pds_family_background_pds_version_id_fkey";
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

export type DatabaseTables03 = {
  "pds_addresses": PdsAddressesTable;
  "pds_children": PdsChildrenTable;
  "pds_education": PdsEducationTable;
  "pds_eligibility": PdsEligibilityTable;
  "pds_family_background": PdsFamilyBackgroundTable;
};
