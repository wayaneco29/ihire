import type { PublicEnums } from "./database-enums";
import type { Json } from "./database-json";

export type PublicFunctions = {
    save_position_scoring_profile: { Args: { p_position_id: string; p_rules: Json }; Returns: string };
    save_scored_posting: { Args: { p_job_id: string | null; p_title: string; p_description: string; p_requirements: string | null; p_slots: number; p_status: PublicEnums["job_status"]; p_deadline: string | null; p_position_ids: string[]; p_scoring: Json | null }; Returns: string };
    application_scoring: { Args: { p_application_id: string }; Returns: { criterion_key: string; applicant_level: number | null; minimum_level: number | null; maximum_points: number; points: number | null; difference: number | null; matched_threshold: number | null }[] };

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
    "apply_to_job_with_review_status": {
        Args: {
            "p_job_id": string;
            "p_position_id": string;
        };
        Returns: string;
    };
    "get_posting_hiring_readiness": {
        Args: {
            "p_job_id": string;
        };
        Returns: {
            "can_hire": boolean;
            "hired_count": number;
            "intake_closed": boolean;
            "pending_applications": number;
            "pending_document_corrections": number;
            "pending_required_documents": number;
            "slot_count": number;
        }[];
    };
    "close_job_posting_intake": {
        Args: {
            "p_job_id": string;
        };
        Returns: boolean;
    };
    "reassign_application_evaluator": {
        Args: {
            "p_application_id": string;
            "p_evaluator_id": string | null;
        };
        Returns: boolean;
    };
    "schedule_application_assessment": {
        Args: {
            "p_application_id": string;
            "p_scheduled_at": string;
        };
        Returns: boolean;
    };
    "save_application_assessment_scores": {
        Args: {
            "p_application_id": string;
            "p_scores": Json;
        };
        Returns: undefined;
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
    "set_pds_current_step_v2": {
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
    "save_pds_step_draft_v2": {
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
    "hire_qualified_applicant": {
        Args: {
            "p_application_id": string;
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
    "submit_applicant_documents_for_review": {
        Args: Record<PropertyKey, never>;
        Returns: number;
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
    "update_hr_position": {
      Args: {
        "p_is_active": boolean | null;
        "p_position_id": string;
        "p_title": string | null;
      };
      Returns: undefined;
    };
};
