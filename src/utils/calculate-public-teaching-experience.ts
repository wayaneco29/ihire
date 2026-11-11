export type PublicTeachingExperienceRecord = {
  date_from: string;
  date_to: string | null;
  is_gov_service: boolean;
  position_title: string;
};

type DatePeriod = {
  startDay: number;
  endDay: number;
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const TEACHING_TITLE_PATTERN = /\b(?:teachers?|instructors?|educators?)\b/i;

function getDayNumber(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  if (new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return timestamp / DAY_IN_MILLISECONDS;
}

function dateFromDayNumber(dayNumber: number): Date {
  return new Date(dayNumber * DAY_IN_MILLISECONDS);
}

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const targetMonth = new Date(Date.UTC(year, month, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(day, daysInTargetMonth),
    ),
  );
}

function getCalendarMonths(period: DatePeriod): number {
  const start = dateFromDayNumber(period.startDay);
  const end = dateFromDayNumber(period.endDay);
  let wholeMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth();
  let monthAnchor = addCalendarMonths(start, wholeMonths);

  if (monthAnchor > end) {
    wholeMonths -= 1;
    monthAnchor = addCalendarMonths(start, wholeMonths);
  }

  const nextMonthAnchor = addCalendarMonths(start, wholeMonths + 1);
  const remainingDays =
    (end.getTime() - monthAnchor.getTime()) / DAY_IN_MILLISECONDS;
  const daysInPartialMonth =
    (nextMonthAnchor.getTime() - monthAnchor.getTime()) /
    DAY_IN_MILLISECONDS;

  return wholeMonths + remainingDays / daysInPartialMonth;
}

export function calculatePublicTeachingExperience(
  records: PublicTeachingExperienceRecord[],
  today = new Date().toISOString().slice(0, 10),
) {
  const todayDay = getDayNumber(today);
  if (todayDay === null) {
    throw new Error("The current date must use YYYY-MM-DD format.");
  }

  const periods = records.flatMap((record) => {
    if (
      !record.is_gov_service ||
      !TEACHING_TITLE_PATTERN.test(record.position_title)
    ) {
      return [];
    }

    const startDay = getDayNumber(record.date_from);
    const recordedEndDay = record.date_to
      ? getDayNumber(record.date_to)
      : todayDay;
    if (startDay === null || recordedEndDay === null) return [];
    const endDay = Math.min(recordedEndDay, todayDay);
    if (endDay <= startDay) return [];
    return [{ startDay, endDay }];
  });

  periods.sort(
    (first, second) =>
      first.startDay - second.startDay || first.endDay - second.endDay,
  );

  const mergedPeriods: DatePeriod[] = [];
  for (const period of periods) {
    const previous = mergedPeriods[mergedPeriods.length - 1];
    if (previous && period.startDay <= previous.endDay) {
      previous.endDay = Math.max(previous.endDay, period.endDay);
    } else {
      mergedPeriods.push({ ...period });
    }
  }

  const qualifyingMonths = mergedPeriods.reduce(
    (total, period) => total + getCalendarMonths(period),
    0,
  );

  return {
    qualifyingMonths,
    incrementLevel: Math.min(31, Math.floor(qualifyingMonths / 6) + 1),
  };
}

export function formatExperienceMonths(months: number): string {
  const totalMonths = Math.floor(months);
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  const formatted = [
    years ? `${years} year${years === 1 ? "" : "s"}` : "",
    remainingMonths
      ? `${remainingMonths} month${remainingMonths === 1 ? "" : "s"}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return formatted || "0 months";
}
