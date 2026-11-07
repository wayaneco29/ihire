"use client";

import type { ReactNode } from "react";
import { Button } from "antd";
import {
  useFieldArray,
  type Control,
  type FieldArray,
  type FieldArrayPath,
  type FieldValues,
} from "react-hook-form";

type Props<
  TValues extends FieldValues,
  TName extends FieldArrayPath<TValues>,
> = {
  addLabel?: string;
  control: Control<TValues>;
  createRow: () => FieldArray<TValues, TName>;
  label: string;
  maxRows?: number;
  minRows?: number;
  name: TName;
  renderRow: (index: number) => ReactNode;
};

export function DynamicRows<
  TValues extends FieldValues,
  TName extends FieldArrayPath<TValues>,
>({
  addLabel = "Add another",
  control,
  createRow,
  label,
  maxRows,
  minRows = 0,
  name,
  renderRow,
}: Props<TValues, TName>) {
  const { fields, append, remove } = useFieldArray<TValues, TName>({
    control,
    name,
  });
  const canAdd = maxRows === undefined || fields.length < maxRows;

  return (
    <section aria-label={label} className="space-y-4">
      {fields.map((field, index) => (
        <div
          className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
          key={field.id}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">
              {label} {index + 1}
            </h3>
            <Button
              danger
              disabled={fields.length <= minRows}
              onClick={() => remove(index)}
              size="small"
              type="text"
            >
              Remove
            </Button>
          </div>
          {renderRow(index)}
        </div>
      ))}

      <Button
        disabled={!canAdd}
        onClick={() => append(createRow())}
        type="dashed"
      >
        {addLabel}
      </Button>
    </section>
  );
}
