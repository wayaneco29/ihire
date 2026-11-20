import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading your applications"
      rows={5}
      showAction
      variant="cards"
    />
  );
}
