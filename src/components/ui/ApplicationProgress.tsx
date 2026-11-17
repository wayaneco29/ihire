const APPLICATION_STAGES = [
  "Submitted",
  "Under evaluation",
  "Assessment",
  "Qualified",
  "Hired",
];

type ApplicationProgressProps = {
  status: string;
  variant?: "segments" | "milestones";
};

function getApplicationStage(status: string) {
  switch (status) {
    case "UNDER_EVALUATION":
      return 1;
    case "ASSESSMENT_SCHEDULED":
    case "ASSESSMENT_SCORED":
      return 2;
    case "QUALIFIED":
      return 3;
    case "HIRED":
      return 4;
    case "NOT_QUALIFIED":
    case "REJECTED":
      return 3;
    case "NOT_SELECTED":
      return 4;
    default:
      return 0;
  }
}

function getStageLabel(stage: string, status: string, index: number) {
  if (index === 3 && ["NOT_QUALIFIED", "REJECTED"].includes(status)) {
    return "Rejected";
  }

  if (index === 4 && status === "NOT_SELECTED") {
    return "Not selected";
  }

  return stage;
}

export function ApplicationProgress({
  status,
  variant = "segments",
}: ApplicationProgressProps) {
  const activeStage = getApplicationStage(status);
  const isUnsuccessful = ["NOT_QUALIFIED", "NOT_SELECTED", "REJECTED"].includes(
    status,
  );
  const stages = APPLICATION_STAGES.map((stage, index) =>
    getStageLabel(stage, status, index),
  );
  const accessibleStatus = status.toLowerCase().replaceAll("_", " ");

  if (variant === "segments") {
    return (
      <div
        aria-label={`Application progress: ${accessibleStatus}`}
        className="mt-3"
        role="group"
      >
        <div className="grid grid-cols-5 gap-1">
          {stages.map((stage, index) => {
            const isCurrent = index === activeStage;
            const isComplete =
              index < activeStage ||
              status === "HIRED" ||
              (status === "SUBMITTED" && index === 0);
            return (
              <span
                aria-hidden="true"
                className={`h-1.5 rounded-full ${
                  isUnsuccessful && isCurrent
                    ? "bg-danger"
                    : isCurrent || isComplete
                      ? "bg-primary"
                      : "bg-line"
                }`}
                key={stage}
              />
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-5 gap-1">
          {stages.map((stage, index) => (
            <span
              className={`text-[10px] leading-4 ${
                index === activeStage ? "font-medium text-ink" : "text-muted"
              }`}
              key={stage}
            >
              {stage}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const progressWidth = `${(activeStage / (stages.length - 1)) * 100}%`;

  return (
    <div
      aria-label={`Application progress: ${accessibleStatus}`}
      className="mt-4"
      role="group"
    >
      <ol
        aria-label="Application stages"
        className="relative grid grid-cols-5"
      >
        <li
          aria-hidden="true"
          className="absolute left-[10%] right-[10%] top-[5px] h-px bg-line"
        >
          <span
            className={`block h-full ${isUnsuccessful ? "bg-danger" : "bg-primary"}`}
            style={{ width: progressWidth }}
          />
        </li>
        {stages.map((stage, index) => {
          const isCurrent = index === activeStage;
          const isComplete =
            index < activeStage ||
            status === "HIRED" ||
            (status === "SUBMITTED" && index === 0);
          const markerClass = isComplete
            ? "border-primary bg-primary"
            : isCurrent
              ? isUnsuccessful
                ? "border-danger bg-panel ring-2 ring-danger/20"
                : status === "ASSESSMENT_SCHEDULED"
                  ? "border-warning bg-panel ring-2 ring-warning/20"
                  : "border-primary bg-panel ring-2 ring-primary/20"
              : "border-line-strong bg-panel";

          return (
            <li
              aria-current={isCurrent ? "step" : undefined}
              className="flex min-w-0 flex-col items-center text-center"
              key={stage}
            >
              <span
                aria-hidden="true"
                className={`relative z-10 size-[11px] rounded-full border-2 ${markerClass}`}
              />
              <span
                className={`mt-2 text-[10px] leading-4 ${
                  isCurrent ? "font-semibold text-ink" : "text-muted"
                }`}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
