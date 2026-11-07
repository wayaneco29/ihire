"use client";

import { Button } from "antd";

export default function AppError({ retry }: { error: Error; retry: () => void }) {
  return (
    <section
      aria-labelledby="app-error-title"
      className="mx-auto mt-8 max-w-xl rounded-2xl border border-danger/20 bg-panel p-6 text-center sm:p-8"
      role="alert"
    >
      <h1 className="text-xl font-semibold text-ink" id="app-error-title">
        This page could not be loaded
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your information is still saved. Try loading the page again.
      </p>
      <Button className="mt-5" onClick={retry} type="primary">
        Try again
      </Button>
    </section>
  );
}
