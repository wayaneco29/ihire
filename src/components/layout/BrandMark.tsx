"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const [sealUnavailable, setSealUnavailable] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-primary/15 bg-primary-light">
        {sealUnavailable ? (
          <span
            aria-label="Division of Southern Leyte seal unavailable"
            className="text-sm font-bold tracking-wide text-primary"
            role="img"
          >
            SL
          </span>
        ) : (
          <Image
            alt="Division of Southern Leyte seal"
            className="h-auto w-11 object-contain"
            height={44}
            onError={() => setSealUnavailable(true)}
            src="/logo.png"
            width={44}
          />
        )}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-ink">
            Southern Leyte
          </p>
          <p className="mt-1 truncate text-xs text-muted">Recruitment portal</p>
        </div>
      )}
    </div>
  );
}
