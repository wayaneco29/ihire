export type ScoringBand = { threshold: number; points: number };
export type ScoringRule = {
  criterion_id: string;
  criterion_key: string;
  title: string;
  points: number;
  minimum_level: number | null;
  bands: ScoringBand[];
};
export type PositionScoring = { position_id: string; rules: ScoringRule[] };
export type EducationLevel = { qualification_level: number; description: string };
