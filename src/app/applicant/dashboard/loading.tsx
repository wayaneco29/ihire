import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return <SkeletonLoader label="Loading applicant dashboard" rows={5} variant="dashboard" />;
}
