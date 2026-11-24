"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/constants/roles";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  const { mobileNavOpen, setMobileNavOpen } = useAppShell();
  const { user, role } = useAuth();

  return (
    <header className="border-b border-line bg-panel px-4 py-3 print:hidden sm:px-6 lg:px-10">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-panel focus:px-4 focus:py-3 focus:text-ink focus:shadow-dropdown"
        href="#main-content"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-workspace flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open navigation menu"
            aria-controls="mobile-navigation"
            aria-expanded={mobileNavOpen}
            className="lg:hidden"
            icon={<Bars3Icon className="size-5" />}
            onClick={() => setMobileNavOpen(true)}
            variant="bordered"
          >
            Menu
          </Button>
          <div>
            <p className="text-base font-semibold text-ink">Recruitment portal</p>
            <p className="text-xs text-muted">{role ? ROLE_LABELS[role] : "Division of Southern Leyte"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          {user && <NotificationBell />}
        </div>
      </div>
    </header>
  );
}
