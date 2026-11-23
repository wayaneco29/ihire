import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-12">
      <section className="max-w-lg rounded-sm border border-line bg-panel p-6 text-center sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          404 · Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          We couldn’t find that page
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The link may be outdated or the page may have moved.
        </p>
        <Link
          className="mt-5 inline-flex min-h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
          href="/"
        >
          Return to portal home
        </Link>
      </section>
    </main>
  );
}
