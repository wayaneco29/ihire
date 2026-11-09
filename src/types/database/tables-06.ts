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

export type PositionCriteriaTable = {
  Row: {
    criterion_key: string;
    display_order: number;
    id: string;
    title: string;
    track: string;
  };
  Insert: {
    criterion_key: string;
    display_order: number;
    id?: string;
    title: string;
    track: string;
  };
  Update: {
    criterion_key?: string;
    display_order?: number;
    id?: string;
    title?: string;
    track?: string;
  };
  Relationships: [];
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
    created_at: string;
    created_by: string;
    id: string;
    is_active: boolean;
    title: string;
    track: string;
  };
  Insert: {
    created_at?: string;
    created_by: string;
    id?: string;
    is_active?: boolean;
    title: string;
    track: string;
  };
  Update: {
    created_at?: string;
    created_by?: string;
    id?: string;
    is_active?: boolean;
    title?: string;
    track?: string;
  };
  Relationships: [
    {
      foreignKeyName: "positions_created_by_fkey";
      columns: ["created_by"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
  ];
};

export type DatabaseTables06 = {
  job_posting_positions: JobPostingPositionsTable;
  position_criteria: PositionCriteriaTable;
  position_criterion_weights: PositionCriterionWeightsTable;
  position_weight_profiles: PositionWeightProfilesTable;
  positions: PositionsTable;
};
