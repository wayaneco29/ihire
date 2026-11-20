import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading job posting details"
      rows={5}
      showAction
      variant="detail"
    />
  );
}
