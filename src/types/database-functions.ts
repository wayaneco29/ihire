import type { PublicEnums } from "./database-enums";

export type PublicFunctions = {
    "education_points": {
        Args: {
            "p_applicant_level": number;
            "p_position_id": string;
        };
        Returns: number | null;
    };
    "education_equivalent_points": {
        Args: {
            "p_applicant_level": number;
            "p_maximum_points": number;
            "p_position_id": string;
        };
        Returns: number | null;
    };
    "training_equivalent_points": {
        Args: {
            "p_maximum_points": number;
            "p_position_id": string;
            "p_training_hours": number;
        };
        Returns: number | null;
    };
    "experience_equivalent_points": {
        Args: {
            "p_applicant_level": number;
            "p_maximum_points": number;
            "p_position_id": string;
        };
        Returns: number | null;
    };
    "apply_to_job": {
        Args: {
            "p_job_id": string;
            "p_position_id": string;
        };
        Returns: string;
    };
    "clone_pds_version": {
        Args: Record<PropertyKey, never>;
        Returns: string;
    };
    "create_job_posting_with_positions": {
        Args: {
            "p_deadline": string | null;
            "p_description": string;
            "p_position_ids": string[];
            "p_requirements": string | null;
            "p_slots": number;
            "p_status": PublicEnums["job_status"];
            "p_title": string;
        };
        Returns: string;
    };
    "complete_pds_step": {
        Args: {
            "p_pds_version_id": string;
            "p_step_number": number;
        };
        Returns: number;
    };
    "create_initial_pds_draft": {
        Args: Record<PropertyKey, never>;
        Returns: string;
    };
    "set_pds_current_step": {
        Args: {
            "p_pds_version_id": string;
            "p_step_number": number;
        };
        Returns: number;
    };
    "save_pds_step_draft": {
        Args: {
            "p_payload": import("./database-json").Json;
            "p_pds_version_id": string;
            "p_step_number": number;
        };
        Returns: string;
    };
    "record_hr_hiring_decision": {
        Args: {
            "target_application_id": string;
            "target_decision": string;
        };
        Returns: string;
    };
    "save_position_weight_profile": {
        Args: {
            "p_position_id": string;
            "p_weights": import("./database-json").Json;
        };
        Returns: string;
    };
    "set_job_posting_positions": {
        Args: {
            "p_job_id": string;
            "p_position_ids": string[];
        };
        Returns: undefined;
    };
    "submit_pds_version": {
        Args: {
            "p_pds_version_id": string;
        };
        Returns: string;
    };
    "update_job_posting_with_positions": {
        Args: {
            "p_deadline": string | null;
            "p_description": string;
            "p_job_id": string;
            "p_position_ids": string[];
            "p_requirements": string | null;
            "p_slots": number;
            "p_status": PublicEnums["job_status"];
            "p_title": string;
        };
        Returns: string;
    };
};
