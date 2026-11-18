import type { Tables } from "@/types/database";
import { formatDate } from "@/utils/format-date";

type PdsAddress = Pick<
  Tables<"pds_addresses">,
  | "house_block_lot_no"
  | "street"
  | "subdivision_village"
  | "barangay"
  | "city_municipality"
  | "province"
  | "zip_code"
>;

type PdsName = {
  first_name?: string | null;
  middle_name?: string | null;
  surname?: string | null;
  name_extension?: string | null;
};

export function formatPdsPersonName(person: PdsName) {
  return [
    person.first_name,
    person.middle_name,
    person.surname,
    person.name_extension,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function formatPdsAddress(address: PdsAddress | null | undefined) {
  if (!address) return "";

  return [
    address.house_block_lot_no,
    address.subdivision_village,
    address.street,
    address.barangay,
    address.city_municipality,
    address.province,
    address.zip_code,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatPdsCode(value: string | null | undefined) {
  if (!value) return "";

  return value
    .trim()
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatPdsOption<T extends string>(
  value: string | null | undefined,
  options: readonly { label: string; value: T }[],
) {
  if (!value) return "";

  return options.find((option) => option.value === value)?.label ?? formatPdsCode(value);
}

const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export function formatPdsSalary(value: number | null | undefined) {
  return value == null ? "" : PHP_FORMATTER.format(value);
}

export function formatPdsDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  format = "MMM YYYY",
) {
  if (!from && !to) return "";

  return [
    from ? formatDate(from, format) : null,
    to ? formatDate(to, format) : null,
  ]
    .filter(Boolean)
    .join(" – ");
}
