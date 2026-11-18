"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PdsSectionCard } from "./PdsSectionCard";
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
        <PdsSectionCard
          aria-label={`${label} ${index + 1}`}
          contentClassName="px-4 pb-4 pt-0 sm:px-5 sm:pb-5"
          contentPadding={false}
          header={
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">
                {label} {index + 1}
              </h3>
              <Button
                className="!text-danger enabled:hover:!bg-danger/10"
                disabled={fields.length <= minRows}
                onClick={() => remove(index)}
                size="sm"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          }
          headerClassName="p-4 pb-0 sm:p-5 sm:pb-0"
          key={field.id}
        >
          {renderRow(index)}
        </PdsSectionCard>
      ))}

      <Button
        disabled={!canAdd}
        onClick={() => append(createRow())}
        variant="bordered"
      >
        {addLabel}
      </Button>
    </section>
  );
}
