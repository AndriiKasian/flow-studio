"use client";

import { createContext, useContext } from "react";

export const WorkflowReadOnlyContext = createContext(false);

export function useWorkflowReadOnly() {
  return useContext(WorkflowReadOnlyContext);
}
