import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export function InviteAccountReady({
  description,
  email,
  alreadyAccepted = false,
}: {
  description: string;
  email: string;
  alreadyAccepted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircleIcon aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-success">
            {alreadyAccepted
              ? "Invitation already accepted"
              : "Invitation accepted"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Your account is ready
          </h1>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{description}</p>

      <div className="mt-5 flex min-w-0 items-center gap-3 rounded-sm border border-line-subtle bg-panel-muted/40 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">
            Sign in with this email
          </p>
          <p className="mt-0.5 break-all text-sm font-semibold text-ink">
            {email}
          </p>
        </div>
      </div>

      <Link
        className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-sm! bg-primary px-4 text-sm! font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        href="/"
        replace
      >
        Go to sign in
      </Link>
    </div>
  );
}
