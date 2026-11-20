import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading hiring dashboard"
      rows={5}
      showAction
      variant="dashboard"
    />
  );
}
