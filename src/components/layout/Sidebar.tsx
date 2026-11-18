"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightStartOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/Button";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { getNavigation } from "@/constants/navigation";

export function Sidebar() {
  const { setMobileNavOpen } = useAppShell();
  const { user, role, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState(false);
  const sections = getNavigation(role);

  async function handleSignOut() {
    setSignOutError(false);
    const { error } = await signOut();
    if (error) {
      setSignOutError(true);
      return;
    }
    setMobileNavOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-full flex-col bg-panel px-3 py-4 text-ink sm:px-4 sm:py-5">
      <div className="border-b border-line-subtle px-2 pb-5">
        <BrandMark />
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto py-6"
      >
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-xs font-semibold text-muted">
              {section.title}
            </p>
            <ul className="mt-2 space-y-1">
              {section.items.map(({ label, href, icon: Icon, available }) => {
                const itemClasses =
                  "flex min-h-11 w-full items-center font-[Bricolage_Grotesque] gap-3 rounded-xs border-l-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
                const isApplicantOverview = href === "/applicant";
                const isActive = isApplicantOverview
                  ? pathname === href || pathname === "/applicant/dashboard"
                  : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <li key={label}>
                    {available ? (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`${itemClasses} ${isActive ? "border-primary bg-primary-light font-semibold text-primary" : "border-transparent text-muted hover:bg-panel-muted hover:text-ink"}`}
                        href={href}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Icon aria-hidden="true" className="size-5 shrink-0" />
                        <span>{label}</span>
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className={`${itemClasses} cursor-not-allowed border-transparent text-disabled`}
                        title="This section will be available in a later build phase"
                      >
                        <Icon aria-hidden="true" className="size-5 shrink-0" />
                        <span className="flex-1">{label}</span>
                        <span className="rounded-full bg-panel-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
                          Soon
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line-subtle pt-4">
        <div className="flex min-w-0 items-center gap-3 rounded-sm bg-panel-muted p-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary-light text-sm font-semibold text-primary"
          >
            {user?.email?.slice(0, 1).toUpperCase() ?? (
              <UserIcon className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {role ?? "Recruitment portal"}
            </p>
            <p className="truncate text-xs text-muted">
              {user?.email ??
                (loading
                  ? "Loading your account…"
                  : "Southern Leyte recruitment workspace.")}
            </p>
          </div>
        </div>

        {user && (
          <div className="pt-2">
            {signOutError && (
              <p className="mb-2 px-3 text-xs text-danger" role="alert">
                Sign out failed. Please try again.
              </p>
            )}
            <Button
              block
              className="flex min-h-11 w-full items-center gap-3 font-[Bricolage_Grotesque]! rounded-sm px-3 py-2 text-left text-sm! transition-colors text-red-500/80 hover:text-red-500/95 hover:bg-red-50"
              disabled={loading}
              icon={<ArrowRightStartOnRectangleIcon className="size-5" />}
              onClick={handleSignOut}
              variant="unstyled"
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
