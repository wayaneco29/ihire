const COUNTRY_LABEL_OVERRIDES: Record<string, string> = {
  AN: "Netherlands Antilles",
  BS: "Bahamas, The",
  BN: "Brunei",
  CV: "Cape Verde",
  MM: "Burma",
  CD: "Congo, Democratic Republic of the",
  CG: "Congo, Republic of the",
  CI: "Cote d'Ivoire",
  CW: "Curacao",
  CZ: "Czech Republic",
  GM: "Gambia, The",
  VA: "Holy See",
  IR: "Iran",
  LA: "Laos",
  MO: "Macau",
  MK: "Macedonia",
  FM: "Micronesia",
  MD: "Moldova",
  PS: "Palestinian Territories",
  RU: "Russia",
  ST: "Sao Tome and Principe",
  SZ: "Swaziland",
  SY: "Syria",
  TR: "Turkey",
};

const COUNTRY_CODES = `
AD AE AF AG AI AL AM AN AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO
FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE
JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO
MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW
PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM
TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW
`
  .trim()
  .split(/\s+/);

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRY_OPTIONS = COUNTRY_CODES.map((code) => ({
  label:
    COUNTRY_LABEL_OVERRIDES[code] ??
    (code === "XK" ? "Kosovo" : (countryNames.of(code) ?? code)),
  value: code,
})).sort((left, right) => left.label.localeCompare(right.label));

export const BLOOD_TYPE_OPTIONS = [
  { label: "A+", value: "A+" },
  { label: "A−", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B−", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB−", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O−", value: "O-" },
] as const;

export const NAME_EXTENSION_OPTIONS = [
  { label: "JR", value: "JR" },
  { label: "SR", value: "SR" },
  { label: "I", value: "I" },
  { label: "II", value: "II" },
  { label: "III", value: "III" },
  { label: "IV", value: "IV" },
  { label: "V", value: "V" },
  { label: "VI", value: "VI" },
  { label: "VIII", value: "VIII" },
  { label: "IX", value: "IX" },
  { label: "X", value: "X" },
] as const;

export const CIVIL_STATUS_OPTIONS = [
  { label: "Single", value: "SINGLE" },
  { label: "Married", value: "MARRIED" },
  { label: "Widow / Widower", value: "WIDOWED" },
  { label: "Separated", value: "SEPARATED" },
  { label: "Solo Parent", value: "SOLO_PARENT" },
  { label: "Other", value: "OTHER" },
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  { label: "Elementary", value: "ELEMENTARY" },
  { label: "Secondary", value: "SECONDARY" },
  { label: "Vocational / Trade", value: "VOCATIONAL_TRADE" },
  { label: "College", value: "COLLEGE" },
  { label: "Graduate Studies", value: "GRADUATE_STUDIES" },
] as const;

export const LEARNING_DEVELOPMENT_TYPE_OPTIONS = [
  { label: "Managerial", value: "Managerial" },
  { label: "Supervisory", value: "Supervisory" },
  { label: "Technical", value: "Technical" },
  { label: "Other", value: "Other" },
] as const;

export const APPOINTMENT_STATUS_OPTIONS = [
  { label: "Permanent", value: "Permanent" },
  { label: "Temporary", value: "Temporary" },
  { label: "Casual", value: "Casual" },
  { label: "Contractual", value: "Contractual" },
  { label: "Coterminous", value: "Coterminous" },
  { label: "Job Order", value: "Job Order" },
  { label: "Other", value: "Other" },
] as const;

export const OTHER_INFO_CATEGORY_OPTIONS = [
  { label: "Special skills and hobbies", value: "SKILL_HOBBY" },
  { label: "Non-academic distinctions and recognition", value: "RECOGNITION" },
  { label: "Membership in associations / organizations", value: "MEMBERSHIP" },
] as const;
