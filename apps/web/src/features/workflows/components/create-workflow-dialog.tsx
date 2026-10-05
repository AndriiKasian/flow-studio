"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFlowSchema,
  type CreateFlowFormInput,
  type CreateFlowInput,
} from "@flow-studio/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createWorkflow } from "@/features/workflows/actions/create-workflow";

export function CreateWorkflowDialog() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFlowFormInput, unknown, CreateFlowInput>({
    resolver: zodResolver(createFlowSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createWorkflow(data);

    if (!result.success) {
      setError("root", {
        message: result.error,
      });

      return;
    }

    reset();
    setOpen(false);
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="size-4" />
            New Workflow
          </Button>
        }
      />

      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create workflow</DialogTitle>

            <DialogDescription>
              Create a new workflow. You can configure its nodes and execution
              later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <label
                htmlFor="workflow-name"
                className="text-sm font-medium"
              >
                Name
              </label>

              <Input
                id="workflow-name"
                placeholder="Customer support workflow"
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
                htmlFor="workflow-description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id="workflow-description"
                placeholder="What does this workflow do?"
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
              {isSubmitting ? "Creating..." : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}