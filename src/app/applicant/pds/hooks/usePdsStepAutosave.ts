"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Json } from "@/types/database";
import { PdsFormNavigationContext } from "../components/PdsForm";
import { savePdsStepDraft } from "../actions/navigation";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveSnapshot = {
  pdsVersionId: string;
  step: number;
  serialized: string;
};

function sameSnapshot(left: SaveSnapshot, right: SaveSnapshot) {
  return (
    left.pdsVersionId === right.pdsVersionId &&
    left.step === right.step &&
    left.serialized === right.serialized
  );
}

export function usePdsStepAutosave(
  pdsVersionId: string,
  step: number,
  values: Record<string, unknown>,
) {
  const serialized = JSON.stringify(values) ?? "{}";
  const registerNavigationSave = useContext(PdsFormNavigationContext);
  const initialSnapshot = { pdsVersionId, step, serialized };
  const latest = useRef<SaveSnapshot>(initialSnapshot);
  const lastSaved = useRef<SaveSnapshot>(initialSnapshot);
  const pending = useRef(false);
  const activeFlush = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    const snapshot = { pdsVersionId, step, serialized };
    latest.current = snapshot;
    pending.current = !sameSnapshot(snapshot, lastSaved.current);
  }, [pdsVersionId, serialized, step]);

  const flush = useCallback(() => {
    if (activeFlush.current) return activeFlush.current;

    const run = async () => {
      let successful = true;

      while (pending.current) {
        const snapshot = latest.current;
        if (sameSnapshot(snapshot, lastSaved.current)) {
          pending.current = false;
          break;
        }

        pending.current = false;
        setStatus("saving");

        let result: Awaited<ReturnType<typeof savePdsStepDraft>>;
        try {
          result = await savePdsStepDraft(
            snapshot.pdsVersionId,
            snapshot.step,
            JSON.parse(snapshot.serialized) as Json,
          );
        } catch {
          result = {
            success: false,
            message: "Your changes could not be saved yet.",
          };
        }

        const isLatest = sameSnapshot(snapshot, latest.current);
        if (result.success) {
          lastSaved.current = snapshot;
          if (isLatest) {
            setStatus("saved");
            setMessage(null);
          }
        } else if (isLatest) {
          successful = false;
          pending.current = true;
          setStatus("error");
          setMessage(result.message ?? "Your changes could not be saved yet.");
          break;
        }

        pending.current = !sameSnapshot(latest.current, lastSaved.current);
      }

      return successful;
    };

    const active = Promise.resolve().then(run);
    activeFlush.current = active;
    void active.then(
      () => {
        if (activeFlush.current === active) activeFlush.current = null;
      },
      () => {
        if (activeFlush.current === active) activeFlush.current = null;
      },
    );
    return active;
  }, []);

  const saveBeforeLeaving = useCallback(async () => {
    const saved = await flush();
    return saved
      ? (JSON.parse(latest.current.serialized) as Record<string, Json>)
      : false;
  }, [flush]);

  const navigationGuard = useMemo(
    () => ({
      hasUnsavedChanges: () => !sameSnapshot(latest.current, lastSaved.current),
      saveBeforeLeaving,
    }),
    [saveBeforeLeaving],
  );

  useEffect(() => {
    if (!pending.current) return;
    setStatus("idle");
    setMessage(null);
    const timeout = window.setTimeout(() => {
      void flush();
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [flush, pdsVersionId, serialized, step]);

  useEffect(() => {
    if (!registerNavigationSave) return;
    registerNavigationSave(navigationGuard);
    return () => registerNavigationSave(null);
  }, [navigationGuard, registerNavigationSave]);

  return { status, message };
}
