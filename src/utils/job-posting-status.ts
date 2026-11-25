export type PostingDisplayStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "EXPIRED"
  | "FILLED";

type PostingStatusInput = {
  status: string;
  deadline: string | null;
  hired: number;
  slots: number;
};

export function isPostingOpenForApplications(
  posting: Pick<PostingStatusInput, "status" | "deadline">,
  now: number,
): boolean {
  if (posting.status !== "OPEN") return false;
  if (!posting.deadline) return true;

  const deadlineTimestamp = Date.parse(posting.deadline);
  return Number.isFinite(deadlineTimestamp) && deadlineTimestamp > now;
}

export function getPostingDisplayStatus(
  posting: PostingStatusInput,
  now: number,
): PostingDisplayStatus {
  if (posting.status === "DRAFT") return "DRAFT";
  if (posting.slots > 0 && posting.hired >= posting.slots) return "FILLED";
  if (posting.status !== "OPEN") return "CLOSED";
  if (!posting.deadline) return "OPEN";

  const deadlineTimestamp = Date.parse(posting.deadline);
  if (!Number.isFinite(deadlineTimestamp)) return "CLOSED";
  return deadlineTimestamp > now ? "OPEN" : "EXPIRED";
}
