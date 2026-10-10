
"use client";

import type { CreateFlowFormInput } from "@flow-studio/shared";
import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowFormFieldsProps {
  idPrefix: string;
  register: UseFormRegister<CreateFlowFormInput>;
  errors: FieldErrors<CreateFlowFormInput>;
  showPlaceholders?: boolean;
}

export function WorkflowFormFields({
  idPrefix,
  register,
  errors,
  showPlaceholders = false,
}: WorkflowFormFieldsProps) {
  return (
    <div className="grid gap-5 py-6">
      <div className="grid gap-2">
        <label
          htmlFor={`${idPrefix}-name`}
          className="text-sm font-medium"
        >
          Name
        </label>

        <Input
          id={`${idPrefix}-name`}
          placeholder={
            showPlaceholders ? "Customer support workflow" : undefined
          }
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />

        {errors.name?.message && (
          <p className="text-destructive text-sm">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <label
          htmlFor={`${idPrefix}-description`}
          className="text-sm font-medium"
        >
          Description
        </label>

        <Textarea
          id={`${idPrefix}-description`}
          placeholder={
            showPlaceholders ? "What does this workflow do?" : undefined
          }
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />

        {errors.description?.message && (
          <p className="text-destructive text-sm">
            {errors.description.message}
          </p>
        )}
      </div>

      {errors.root?.message && (
        <p className="text-destructive text-sm">
          {errors.root.message}
        </p>
      )}
    </div>
  );
}
