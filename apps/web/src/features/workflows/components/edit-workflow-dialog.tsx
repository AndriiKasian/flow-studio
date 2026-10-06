"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFlowSchema,
  type CreateFlowFormInput,
  type CreateFlowInput,
  type Flow,
} from "@flow-studio/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateWorkflow } from "@/features/workflows/actions/update-workflow";

interface EditWorkflowDialogProps {
  flow: Flow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkflowDialog({
  flow,
  open,
  onOpenChange,
}: EditWorkflowDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFlowFormInput, unknown, CreateFlowInput>({
    resolver: zodResolver(createFlowSchema),
    defaultValues: {
      name: flow.name,
      description: flow.description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: flow.name,
        description: flow.description ?? "",
      });
    }
  }, [flow, open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const result = await updateWorkflow(flow.id, data);

    if (!result.success) {
      setError("root", {
        message: result.error,
      });

      return;
    }

    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit workflow</DialogTitle>

            <DialogDescription>
              Update the workflow name and description.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <label
                htmlFor={`workflow-name-${flow.id}`}
                className="text-sm font-medium"
              >
                Name
              </label>

              <Input
                id={`workflow-name-${flow.id}`}
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
                htmlFor={`workflow-description-${flow.id}`}
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id={`workflow-description-${flow.id}`}
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

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />

            <Button
              type="submit"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
