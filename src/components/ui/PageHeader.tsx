"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useSetPageHeader } from "@/context/AppShellContext";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  const setPageHeader = useSetPageHeader();
  const id = useId();

  useEffect(() => {
    setPageHeader({ id, title, description, actions });
    return () => {
      setPageHeader((current) => (current?.id === id ? null : current));
    };
  }, [actions, description, id, setPageHeader, title]);

  return null;
}
