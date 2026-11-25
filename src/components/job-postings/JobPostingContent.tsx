type JobPostingContentProps = {
  description: string;
  requirements: string[];
  requirementsPdfUrl: string | null;
};

export function JobPostingContent({
  description,
  requirements,
  requirementsPdfUrl,
}: Readonly<JobPostingContentProps>) {
  return (
    <>
      <section className="py-6">
        <h2 className="text-base font-semibold text-ink">Position details</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
          {description}
        </p>
      </section>

      {requirements.length > 0 && (
        <section className="border-t border-line-subtle py-6">
          <h2 className="text-base font-semibold text-ink">Requirements</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
            {requirements.map((requirement, index) => (
              <li key={`${index}-${requirement}`}>{requirement}</li>
            ))}
          </ul>
        </section>
      )}

      {requirementsPdfUrl && (
        <section className="border-t border-line-subtle py-6">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel-muted p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Attached requirements PDF
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                View the document HR uploaded with this job posting.
              </p>
            </div>
            <a
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href={requirementsPdfUrl}
              rel="noreferrer"
              target="_blank"
            >
              View uploaded PDF
            </a>
          </div>
        </section>
      )}
    </>
  );
}
