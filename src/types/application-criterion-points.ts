export type ApplicationCriterionPointsRow = {
  id: string;
  title: string;
  maximumPoints: number;
  earnedPoints: number | null;
  earnedStatus: "scored" | "not_scored" | "unavailable";
  detail?: string;
};
