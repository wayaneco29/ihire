import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

export type ApplicationEvent = {
  id: string;
  title: string;
  status: string;
  date: string | null;
  remarks: string | null;
};

export function ApplicationTimeline({
  events,
  currentStatus,
}: {
  events: ApplicationEvent[];
  currentStatus: string;
}) {
  return (
    <ol className="mt-5 space-y-0">
      {events.map((event, index) => (
        <li className="relative flex gap-4 pb-6 last:pb-0" key={event.id}>
          {index < events.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute left-[9px] top-5 h-full w-px bg-line"
            />
          )}
          <span
            className={`relative mt-1 size-5 shrink-0 rounded-full border-4 border-hero-line ring-1 ${event.status === currentStatus ? "bg-primary ring-primary/30" : "bg-line-strong ring-line"}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{event.title}</p>
              <WorkflowStatusTag status={event.status} />
            </div>
            {event.date && (
              <time
                className="mt-1 block text-xs text-muted"
                dateTime={event.date}
              >
                {formatDate(event.date, "MMM D, YYYY · h:mm A")}
              </time>
            )}
            {event.remarks && (
              <p className="mt-3 whitespace-pre-wrap rounded-sm bg-panel-muted p-3 text-sm leading-6 text-ink">
                {event.remarks}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
