export type JobPostingPositionsTable = {
  Row: {
    created_at: string;
    job_id: string;
    position_id: string;
    weight_profile_id: string;
  };
  Insert: {
    created_at?: string;
    job_id: string;
    position_id: string;
    weight_profile_id: string;
  };
  Update: {
    created_at?: string;
    job_id?: string;
    position_id?: string;
    weight_profile_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: "job_posting_positions_job_id_fkey";
      columns: ["job_id"];
      isOneToOne: false;
      referencedRelation: "job_postings";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "job_posting_positions_position_id_fkey";
      columns: ["position_id"];
      isOneToOne: false;
      referencedRelation: "positions";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "job_posting_positions_profile_position_fkey";
      columns: ["weight_profile_id", "position_id"];
      isOneToOne: false;
      referencedRelation: "position_weight_profiles";
      referencedColumns: ["id", "position_id"];
    },
  ];
};

export type ApplicationTypeTable = {
  Row: {
    id: string;
    name: string;
  };
  Insert: {
    id?: string;
    name: string;
  };
  Update: {
    id?: string;
    name?: string;
  };
  Relationships: [];
};

export type PositionCriteriaTable = {
  Row: {
    criterion_key: string;
    display_order: number;
    id: string;
    position_id: string;
    title: string;
  };
  Insert: {
    criterion_key: string;
    display_order: number;
    id?: string;
    position_id: string;
    title: string;
  };
  Update: {
    criterion_key?: string;
    display_order?: number;
    id?: string;
    position_id?: string;
    title?: string;
  };
  Relationships: [
    {
      foreignKeyName: "position_criteria_position_id_fkey";
      columns: ["position_id"];
      isOneToOne: false;
      referencedRelation: "positions";
      referencedColumns: ["id"];
    },
  ];
};

export type PositionCriterionWeightsTable = {
  Row: {
    criterion_id: string;
    points: number;
    profile_id: string;
  };
  Insert: {
    criterion_id: string;
    points: number;
    profile_id: string;
  };
  Update: {
    criterion_id?: string;
    points?: number;
    profile_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: "position_criterion_weights_criterion_id_fkey";
      columns: ["criterion_id"];
      isOneToOne: false;
      referencedRelation: "position_criteria";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "position_criterion_weights_profile_id_fkey";
      columns: ["profile_id"];
      isOneToOne: false;
      referencedRelation: "position_weight_profiles";
      referencedColumns: ["id"];
    },
  ];
};

export type PositionWeightProfilesTable = {
  Row: {
    created_at: string;
    created_by: string;
    id: string;
    is_current: boolean;
    position_id: string;
    version: number;
  };
  Insert: {
    created_at?: string;
    created_by: string;
    id?: string;
    is_current?: boolean;
    position_id: string;
    version: number;
  };
  Update: {
    created_at?: string;
    created_by?: string;
    id?: string;
    is_current?: boolean;
    position_id?: string;
    version?: number;
  };
  Relationships: [
    {
      foreignKeyName: "position_weight_profiles_created_by_fkey";
      columns: ["created_by"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "position_weight_profiles_position_id_fkey";
      columns: ["position_id"];
      isOneToOne: false;
      referencedRelation: "positions";
      referencedColumns: ["id"];
    },
  ];
};

export type PositionsTable = {
  Row: {
    application_type_id: string;
    base_qualification_level: number | null;
    base_training_increment_level: number | null;
    base_experience_increment_level: number | null;
    id: string;
    is_active: boolean;
    title: string;
  };
  Insert: {
    application_type_id: string;
    base_qualification_level?: number | null;
    base_training_increment_level?: number | null;
    base_experience_increment_level?: number | null;
    id?: string;
    is_active?: boolean;
    title: string;
  };
  Update: {
    application_type_id?: string;
    base_qualification_level?: number | null;
    base_training_increment_level?: number | null;
    base_experience_increment_level?: number | null;
    id?: string;
    is_active?: boolean;
    title?: string;
  };
  Relationships: [
    {
      foreignKeyName: "positions_application_type_id_fkey";
      columns: ["application_type_id"];
      isOneToOne: false;
      referencedRelation: "application_type";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "positions_base_qualification_level_fkey";
      columns: ["base_qualification_level"];
      isOneToOne: false;
      referencedRelation: "education_levels";
      referencedColumns: ["qualification_level"];
    },
  ];
};

export type DatabaseTables06 = {
  application_type: ApplicationTypeTable;
  job_posting_positions: JobPostingPositionsTable;
  position_criteria: PositionCriteriaTable;
  position_criterion_weights: PositionCriterionWeightsTable;
  position_weight_profiles: PositionWeightProfilesTable;
  positions: PositionsTable;
};
