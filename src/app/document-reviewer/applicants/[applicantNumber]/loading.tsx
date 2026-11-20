import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return <SkeletonLoader label="Loading applicant documents" rows={5} variant="documents" />;
}
