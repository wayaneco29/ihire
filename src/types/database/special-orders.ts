type SpecialOrderRow = {
  application_id: string;
  applicant_name: string;
  position: string;
  designation: string;
  order_number: string;
  order_date: string;
  updated_at: string;
};

export type SpecialOrderTables = {
  application_special_orders: {
    Row: SpecialOrderRow;
    Insert: Omit<SpecialOrderRow, "updated_at" | "order_number"> & { updated_at?: string; order_number?: string };
    Update: Partial<SpecialOrderRow>;
    Relationships: [{ foreignKeyName: "application_special_orders_application_id_fkey"; columns: ["application_id"]; isOneToOne: true; referencedRelation: "applications"; referencedColumns: ["id"] }];
  };
};
