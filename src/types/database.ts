import type { DatabaseTables01 } from './database/tables-01';
import type { DatabaseTables02 } from './database/tables-02';
import type { DatabaseTables03 } from './database/tables-03';
import type { DatabaseTables04 } from './database/tables-04';
import type { DatabaseTables05 } from './database/tables-05';
import type { PublicCompositeTypes } from './database-composite-types';
import type { PublicEnums } from './database-enums';
import type { PublicFunctions } from './database-functions';
import type { PublicViews } from './database-views';
export type { Json } from './database-json';
export { Constants } from './database-constants';

export type Database = {
  public: {
    Tables: DatabaseTables01 & DatabaseTables02 & DatabaseTables03 & DatabaseTables04 & DatabaseTables05;
    Views: PublicViews;
    Functions: PublicFunctions;
    Enums: PublicEnums;
    CompositeTypes: PublicCompositeTypes;
  };
};

type PublicSchema = Database['public'];
export type Tables<Name extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][Name] extends { Row: infer Row } ? Row : never;
export type TablesInsert<Name extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][Name] extends { Insert: infer Insert } ? Insert : never;
export type TablesUpdate<Name extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][Name] extends { Update: infer Update } ? Update : never;
export type Enums<Name extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][Name];
export type CompositeTypes<Name extends keyof PublicSchema["CompositeTypes"]> =
  PublicSchema["CompositeTypes"][Name];
