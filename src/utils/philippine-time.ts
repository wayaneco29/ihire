const PHILIPPINE_TIME_ZONE = "Asia/Manila";

export function philippineToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftIsoDate(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * 86_400_000)
    .toISOString().slice(0, 10);
}

export function formatPhilippineDay(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function formatPhilippineTime(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPhilippineDateTimeInput(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

export function toPhilippineISOString(value: string): string {
  return new Date(`${value}:00+08:00`).toISOString();
}

export function isFuturePhilippineDateTime(value: string): boolean {
  const timestamp = Date.parse(`${value}:00+08:00`);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return false;

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const fields = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}` === value;
}

export function formatPhilippineDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const formatted = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PHILIPPINE_TIME_ZONE,
  }).format(date);
  return `${formatted} (Philippine time)`;
}
