"use client";

import {
  connectionErrorMessages,
  type ConnectionError,
} from "../lib/workflow-connection";

import { WorkflowToast } from "./workflow-toast";

type ConnectionErrorAlertProps = {
  error: ConnectionError | null;
  onDismiss: () => void;
};

export function ConnectionErrorAlert({
  error,
  onDismiss,
}: ConnectionErrorAlertProps) {
  return (
    <WorkflowToast
      message={error ? connectionErrorMessages[error] : null}
      variant="error"
      onDismiss={onDismiss}
    />
  );
}