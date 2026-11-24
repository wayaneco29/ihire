"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useAppShell } from "@/context/AppShellContext";
import { Sidebar } from "./Sidebar";

export function MobileDrawer() {
  const { mobileNavOpen, setMobileNavOpen } = useAppShell();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !drawerRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !drawerRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <Button
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-ink/45"
        onClick={() => setMobileNavOpen(false)}
        type="button"
        variant="unstyled"
      />
      <section
        aria-labelledby="mobile-navigation-title"
        aria-modal="true"
        className="mobile-drawer-panel absolute inset-y-0 left-0 flex flex-col overflow-y-auto border-r border-line bg-panel shadow-modal"
        id="mobile-navigation"
        role="dialog"
        ref={drawerRef}
        tabIndex={-1}
      >
        <div className="flex min-h-16 shrink-0 items-center justify-end px-3">
          <h2 className="sr-only" id="mobile-navigation-title">
            Navigation
          </h2>
          <Button
            aria-label="Close navigation menu"
            className="flex min-h-11 items-center gap-2 rounded-sm px-3 text-muted hover:bg-panel-muted"
            onClick={() => setMobileNavOpen(false)}
            ref={closeButtonRef}
            type="button"
            variant="unstyled"
          >
            <XMarkIcon className="size-5" />
            Close menu
          </Button>
        </div>
        <Sidebar />
      </section>
    </div>
  );
}
