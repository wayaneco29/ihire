"use client";

import { createContext } from "react";
import type { Json } from "@/types/database";

export type SaveBeforeLeaving = () => Promise<Record<string, Json> | false>;

export type PdsNavigationGuard = {
  hasUnsavedChanges: () => boolean;
  saveBeforeLeaving: SaveBeforeLeaving;
};

type RegisterNavigationGuard = (guard: PdsNavigationGuard | null) => void;

export const PdsFormNavigationContext =
  createContext<RegisterNavigationGuard | null>(null);
