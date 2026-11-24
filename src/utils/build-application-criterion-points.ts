import type { ApplicationCriterionPointsRow } from "@/types/application-criterion-points";

type Criterion = {
  id: string;
  criterion_key: string;
  title: string;
};

type CriterionWeight = {
  criterion_id: string;
  points: number;
};

type CriterionScore = {
  criterion_id: string;
  points: number;
};

export function buildApplicationCriterionPoints({
  criteria,
  weights,
  scores,
  educationPoints,
  educationUnavailable,
  trainingPoints,
  trainingUnavailable,
  experiencePoints,
  experienceUnavailable,
  scoresUnavailable,
}: Readonly<{
  criteria: Criterion[];
  weights: CriterionWeight[];
  scores: CriterionScore[];
  educationPoints: {
    education_points: number | null;
  } | null;
  educationUnavailable: boolean;
  trainingPoints: {
    training_hours: number | null;
    training_points: number | null;
  } | null;
  trainingUnavailable: boolean;
  experiencePoints: {
    points: number | null;
  };
  experienceUnavailable: boolean;
  scoresUnavailable: boolean;
}>): ApplicationCriterionPointsRow[] {
  const weightsByCriterion = new Map(
    weights.map((weight) => [weight.criterion_id, weight.points]),
  );
  const scoresByCriterion = new Map(
    scores.map((score) => [score.criterion_id, score.points]),
  );

  return criteria.flatMap((criterion): ApplicationCriterionPointsRow[] => {
    const maximumPoints = weightsByCriterion.get(criterion.id);
    if (maximumPoints === undefined) return [];

    if (criterion.criterion_key === "EDUCATION") {
      const earnedPoints = educationPoints?.education_points ?? null;
      return [
        {
          id: criterion.id,
          title: criterion.title,
          maximumPoints,
          earnedPoints,
          earnedStatus: educationUnavailable
            ? "unavailable"
            : earnedPoints === null
              ? "not_scored"
              : "scored",
        },
      ];
    }

    if (criterion.criterion_key === "TRAINING") {
      const earnedPoints = trainingPoints?.training_points ?? null;
      return [
        {
          id: criterion.id,
          title: criterion.title,
          maximumPoints,
          earnedPoints,
          earnedStatus: trainingUnavailable
            ? "unavailable"
            : earnedPoints === null
              ? "not_scored"
              : "scored",
          detail:
            trainingPoints?.training_hours !== null &&
            trainingPoints?.training_hours !== undefined
              ? `${trainingPoints.training_hours} submitted training hours.`
              : undefined,
        },
      ];
    }

    if (criterion.criterion_key === "EXPERIENCE") {
      const earnedPoints = experiencePoints.points;
      return [
        {
          id: criterion.id,
          title: criterion.title,
          maximumPoints,
          earnedPoints,
          earnedStatus: experienceUnavailable
            ? "unavailable"
            : earnedPoints === null
              ? "not_scored"
              : "scored",
        },
      ];
    }

    const earnedPoints = scoresByCriterion.get(criterion.id);
    return [
      {
        id: criterion.id,
        title: criterion.title,
        maximumPoints,
        earnedPoints: earnedPoints ?? null,
        earnedStatus: scoresUnavailable
          ? "unavailable"
          : earnedPoints === undefined
            ? "not_scored"
            : "scored",
      },
    ];
  });
}
