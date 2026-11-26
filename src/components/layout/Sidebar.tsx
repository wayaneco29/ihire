"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightStartOnRectangleIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/Button";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/constants/roles";
import { getNavigation } from "@/constants/navigation";
import { useAccountSecurity } from "./AccountSecurityProvider";

export function Sidebar() {
  const { setMobileNavOpen } = useAppShell();
  const { openChangePassword } = useAccountSecurity();
  const { user, role, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState(false);
  const sections = loading ? [] : getNavigation(role);

  async function handleSignOut() {
    setSignOutError(false);
    const { error } = await signOut();
    if (error) {
      setSignOutError(true);
      return;
    }
    setMobileNavOpen(false);
    router.replace("/");
    router.refresh();
  }

  function handleChangePassword() {
    setMobileNavOpen(false);
    openChangePassword();
  }

  return (
    <aside className="flex h-full w-full flex-col bg-panel px-3 py-4 text-ink sm:px-4 sm:py-5">
      <div className="border-b border-line-subtle px-2 pb-5">
        <BrandMark />
      </div>

      <nav
        aria-label="Main navigation"
        aria-busy={loading}
        className="flex-1 space-y-6 overflow-y-auto py-6"
      >
        {loading && (
          <div role="status" className="space-y-3 px-3">
            <span className="sr-only">Loading navigation</span>
            {[0, 1, 2, 3].map((item) => (
              <div key={item} aria-hidden="true" className="h-11 animate-pulse rounded-sm bg-panel-muted motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-xs font-semibold text-muted">
              {section.title}
            </p>
            <ul className="mt-2 space-y-1">
              {section.items.map(({ label, href, icon: Icon, available }) => {
                const itemClasses =
                  "flex min-h-11 w-full items-center gap-3 rounded-sm border-l-4 px-3 py-2 text-left text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
                const isApplicantOverview = href === "/applicant/dashboard";
                const isActive = isApplicantOverview
                  ? pathname === href || pathname === "/applicant"
                  : pathname === href || pathname.startsWith(`${href}/`) ||
                    (href === "/document-reviewer/documents" && pathname.startsWith("/document-reviewer/applicants/"));

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
      {user && !loading && (
        <div className="pt-2 pb-4">
          <Button
            block
            className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-base! font-semibold text-muted transition-colors hover:bg-panel-muted hover:text-ink"
            disabled={loading}
            icon={<LockClosedIcon className="size-5" />}
            onClick={handleChangePassword}
            variant="unstyled"
          >
            Change password
          </Button>
          {signOutError && (
            <p className="mb-2 px-3 text-xs text-danger" role="alert">
              Sign out failed. Please try again.
            </p>
          )}
          <Button
            block
            className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-base! font-semibold text-danger transition-colors hover:bg-danger/10"
            disabled={loading}
            icon={<ArrowRightStartOnRectangleIcon className="size-5" />}
            onClick={handleSignOut}
            variant="unstyled"
          >
            Sign out
          </Button>
        </div>
      )}
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
              {loading ? "Loading your account…" : role ? ROLE_LABELS[role] : "Recruitment portal"}
            </p>
            <p className="truncate text-xs text-muted">
              {user?.email ??
                (loading
                  ? "Loading your account…"
                  : "Southern Leyte recruitment workspace.")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
