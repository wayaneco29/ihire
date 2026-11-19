export type PostingDisplayStatus = "DRAFT" | "OPEN" | "CLOSED" | "FILLED";

type PostingStatusInput = {
  status: string;
  deadline: string | null;
  hired: number;
  slots: number;
};

export function getPostingDisplayStatus(
  posting: PostingStatusInput,
  now: number,
): PostingDisplayStatus {
  if (posting.status === "DRAFT") return "DRAFT";
  if (posting.slots > 0 && posting.hired >= posting.slots) return "FILLED";
  if (posting.status !== "OPEN") return "CLOSED";
  if (!posting.deadline) return "OPEN";

  const deadlineTimestamp = Date.parse(posting.deadline);
  return Number.isFinite(deadlineTimestamp) && deadlineTimestamp > now
    ? "OPEN"
    : "CLOSED";
}
