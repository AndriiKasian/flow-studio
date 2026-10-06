"use client";

import type { Flow } from "@flow-studio/shared";
import { useState } from "react";

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
import { deleteWorkflow } from "@/features/workflows/actions/delete-workflow";

interface DeleteWorkflowDialogProps {
  flow: Flow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteWorkflowDialog({
  flow,
  open,
  onOpenChange,
}: DeleteWorkflowDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const result = await deleteWorkflow(flow.id);

    if (!result.success) {
      setError(result.error);
      setIsDeleting(false);
      return;
    }

    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isDeleting) {
      return;
    }

    if (!nextOpen) {
      setError(null);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workflow?</DialogTitle>

          <DialogDescription>
            This will permanently delete &quot;{flow.name}&quot;. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
              >
                Cancel
              </Button>
            }
          />

          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
