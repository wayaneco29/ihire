import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading the review queue"
      rows={5}
      showAction
      variant="queue"
    />
  );
}
