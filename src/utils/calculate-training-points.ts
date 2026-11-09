export function calculateTrainingPoints(
  trainingHours: number,
  maximumPoints: number,
) {
  const earnedPoints = Math.max(0, trainingHours) / 3;
  return Math.min(Math.round(earnedPoints * 100) / 100, maximumPoints);
}
