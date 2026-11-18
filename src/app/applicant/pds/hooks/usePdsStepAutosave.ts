"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Json } from "@/types/database";
import { PdsFormNavigationContext } from "../components/PdsForm";
import { savePdsStepDraft } from "../actions/navigation";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveSnapshot = {
  pdsVersionId: string;
  step: number;
  serialized: string;
};

export function usePdsStepAutosave(
  pdsVersionId: string,
  step: number,
  values: Record<string, unknown>,
) {
  const serialized = JSON.stringify(values) ?? "{}";
  const registerNavigationSave = useContext(PdsFormNavigationContext);
  const latest = useRef<SaveSnapshot>({ pdsVersionId, step, serialized });
  const pending = useRef(false);
  const saving = useRef(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const flush = useCallback(async () => {
    if (saving.current) return false;
    saving.current = true;
    let successful = true;

    try {
      while (pending.current) {
        pending.current = false;
        const snapshot = latest.current;
        setStatus("saving");
        const result = await savePdsStepDraft(
          snapshot.pdsVersionId,
          snapshot.step,
          JSON.parse(snapshot.serialized) as Json,
        );

        const isLatest =
          snapshot.pdsVersionId === latest.current.pdsVersionId &&
          snapshot.step === latest.current.step &&
          snapshot.serialized === latest.current.serialized;

        if (isLatest) {
          if (result.success) {
            setStatus("saved");
            setMessage(null);
          } else {
            successful = false;
            setStatus("error");
            setMessage(result.message ?? "Your changes could not be saved yet.");
          }
        }

        if (!isLatest) pending.current = true;
      }
    } finally {
      saving.current = false;
    }

    return successful;
  }, []);

  const saveBeforeLeaving = useCallback(async () => {
    const saved = await flush();
    return saved
      ? (JSON.parse(latest.current.serialized) as Record<string, Json>)
      : false;
  }, [flush]);

  useEffect(() => {
    latest.current = { pdsVersionId, step, serialized };
    pending.current = true;

    const resetStatus = window.setTimeout(() => {
      if (!saving.current && pending.current) setStatus("idle");
    }, 0);
    const timeout = window.setTimeout(() => {
      void flush();
    }, 700);

    return () => {
      window.clearTimeout(resetStatus);
      window.clearTimeout(timeout);
    };
  }, [flush, pdsVersionId, serialized, step]);

  useEffect(() => {
    if (!registerNavigationSave) return;
    registerNavigationSave(saveBeforeLeaving);
    return () => registerNavigationSave(null);
  }, [registerNavigationSave, saveBeforeLeaving]);

  return { flush, status, message };
}
