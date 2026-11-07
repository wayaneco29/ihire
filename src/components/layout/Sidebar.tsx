"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "./BrandMark";
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
    <aside className="flex h-full w-full flex-col bg-white px-4 py-5">
      <div className="border-b border-slate-100 px-2 pb-5">
        <BrandMark />
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-7 py-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {section.title}
            </p>
            <ul className="mt-2 space-y-1">
              {section.items.map(({ label, href, icon: Icon, available }) => {
                const itemClasses =
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition";
                const icon = <Icon className="text-base" />;
                const isApplicantOverview = href === "/applicant";
                const isActive = isApplicantOverview
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <li key={label}>
                    {available ? (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`${itemClasses} ${isActive ? "bg-primary-light font-medium text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
                        href={href}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {icon}
                        <span>{label}</span>
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className={`${itemClasses} cursor-not-allowed text-muted`}
                        title="This section will be available in a later build phase"
                      >
                        {icon}
                        <span className="flex-1">{label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
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

      <div className="rounded-2xl border border-primary/10 bg-primary-light/70 p-4">
        <p className="text-xs font-semibold text-primary">
          {role ?? "Recruitment portal"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {user?.email ??
            (loading
              ? "Loading your account…"
              : "Some workspace sections are being built in later phases.")}
        </p>
      </div>

      {user && (
        <div className="pt-4">
          {signOutError && (
            <p className="mb-2 text-xs text-danger" role="alert">
              Sign out failed. Please try again.
            </p>
          )}
          <Button block disabled={loading} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </aside>
  );
}
