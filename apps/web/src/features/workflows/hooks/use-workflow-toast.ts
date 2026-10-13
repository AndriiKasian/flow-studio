"use client";

import { useCallback, useState } from "react";

type ToastVariant = "success" | "error";

export function useWorkflowToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<ToastVariant>("success");

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const showSuccess = useCallback((text: string) => {
    setVariant("success");
    setMessage(text);
  }, []);

  const showError = useCallback((text: string) => {
    setVariant("error");
    setMessage(text);
  }, []);

  return {
    message,
    variant,
    clearMessage,
    showSuccess,
    showError,
  };
}
