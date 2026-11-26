import { ArrowPathIcon } from "@heroicons/react/24/outline";

export function FormLoading({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-64 w-full items-center justify-center py-10">
      <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col items-center gap-4 text-center">
        <ArrowPathIcon aria-hidden="true" className="size-10 animate-spin text-primary motion-reduce:animate-none" />
        <p className="text-lg font-semibold text-ink">{message}</p>
        <p className="text-sm text-muted">Please wait a moment.</p>
      </div>
    </div>
  );
}
