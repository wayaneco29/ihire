"use client";

import { FormInput } from "@/components/form";
import type { Control } from "react-hook-form";
import type { PdsStepOneValues } from "../../schema";

type AddressPrefix = "addresses.residential" | "addresses.permanent";

type Props = {
  control: Control<PdsStepOneValues>;
  disabled?: boolean;
  prefix: AddressPrefix;
};

export function AddressFields({ control, disabled = false, prefix }: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 p-4">
      <FormInput
        control={control}
        disabled={disabled}
        label="House / block / lot no."
        name={`${prefix}.house_block_lot_no`}
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="Street"
        name={`${prefix}.street`}
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="Subdivision / village"
        name={`${prefix}.subdivision_village`}
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="Barangay"
        name={`${prefix}.barangay`}
        required
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="City / municipality"
        name={`${prefix}.city_municipality`}
        required
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="Province"
        name={`${prefix}.province`}
        required
      />
      <FormInput
        control={control}
        disabled={disabled}
        label="ZIP code"
        name={`${prefix}.zip_code`}
        required
      />
    </div>
  );
}
