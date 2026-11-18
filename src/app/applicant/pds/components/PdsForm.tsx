"use client";

import { createContext } from "react";
import type { Json } from "@/types/database";

export type SaveBeforeLeaving = () => Promise<Record<string, Json> | false>;

type RegisterSave = (save: SaveBeforeLeaving | null) => void;

export const PdsFormNavigationContext = createContext<RegisterSave | null>(
  null,
);
