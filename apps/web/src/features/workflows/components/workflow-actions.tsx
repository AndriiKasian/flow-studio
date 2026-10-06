"use client";

import type { Flow } from "@flow-studio/shared";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DeleteWorkflowDialog } from "./delete-workflow-dialog";
import { EditWorkflowDialog } from "./edit-workflow-dialog";

interface WorkflowActionsProps {
  flow: Flow;
}

export function WorkflowActions({ flow }: WorkflowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Actions for ${flow.name}`}
            >
              <MoreVertical className="size-4" />
            </Button>
          }
        />

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditWorkflowDialog
        flow={flow}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteWorkflowDialog
        flow={flow}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}