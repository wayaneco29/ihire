import dayjs, { type ConfigType } from "dayjs";

export function formatDate(value: ConfigType, format = "MMM D, YYYY") {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format(format) : "—";
}
