"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
  addButtonPlacement?: "after-list" | "last-row";
  addButtonVariant?: ButtonVariant;
  addIcon?: ReactNode;
  control: Control<TValues>;
  createRow: () => FieldArray<TValues, TName>;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyNote?: string;
  emptyTitle?: string;
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
  addButtonPlacement = "after-list",
  addButtonVariant = "bordered",
  addIcon,
  control,
  createRow,
  emptyDescription,
  emptyIcon,
  emptyNote,
  emptyTitle,
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
  const addButton = (
    <Button
      disabled={!canAdd}
      icon={addIcon}
      onClick={() => append(createRow())}
      variant={addButtonVariant}
    >
      {addLabel}
    </Button>
  );

  return (
    <section aria-label={label} className="space-y-4">
      {fields.length === 0 ? (
        emptyTitle ? (
          <EmptyState
            action={
              <div className="flex flex-col items-center gap-2">
                {addButton}
                {emptyNote && <p className="text-sm text-muted">{emptyNote}</p>}
              </div>
            }
            className="py-0 rounded-lg border border-dashed border-line bg-linear-to-b from-panel-muted to-panel px-4 text-center shadow-none"
            contentClassName="max-w-[30rem]"
            description={emptyDescription}
            headingClassName="font-semibold text-ink"
            icon={emptyIcon}
            iconClassName="mb-2 size-[5.5rem] rounded-full border-none bg-transparent text-primary size-11!"
            title={emptyTitle}
          />
        ) : (
          addButton
        )
      ) : (
        <>
          {fields.map((field, index) => {
            const isLastRow = index === fields.length - 1;
            const showAddButtonInRow =
              addButtonPlacement === "last-row" && isLastRow;

            return (
              <PdsSectionCard
                aria-label={`${label} ${index + 1}`}
                contentClassName="px-4 pb-4 pt-0 sm:px-5 sm:pb-5"
                contentPadding={false}
                header={
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-line-subtle bg-primary-light px-4 py-3 sm:px-5">
                    <h3 className="text-sm font-semibold text-ink">
                      {label} {index + 1}
                    </h3>
                    <Button
                      className="!text-danger enabled:hover:bg-danger/10!"
                      disabled={fields.length <= minRows}
                      onClick={() => remove(index)}
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                }
                key={field.id}
              >
                {renderRow(index)}
                {showAddButtonInRow && (
                  <div className="mt-4 border-t border-line-subtle pt-4">
                    {addButton}
                  </div>
                )}
              </PdsSectionCard>
            );
          })}
          {addButtonPlacement === "after-list" && addButton}
        </>
      )}
    </section>
  );
}
