export type PublicFunctions = {
    "apply_to_job": {
        Args: {
            "p_job_id": string;
        };
        Returns: string;
    };
    "clone_pds_version": {
        Args: Record<PropertyKey, never>;
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
    "submit_pds_version": {
        Args: {
            "p_pds_version_id": string;
        };
        Returns: string;
    };
};
