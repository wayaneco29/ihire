import type {
  Control,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";

export type FormControlProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  id?: string;
  hint?: string;
  required?: boolean;
  rules?: RegisterOptions<T, Path<T>>;
};

export function fieldId(name: string, id?: string) {
  return id ?? `field-${name.replaceAll(".", "-")}`;
}
