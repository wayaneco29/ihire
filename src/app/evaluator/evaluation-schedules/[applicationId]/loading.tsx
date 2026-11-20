import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return <SkeletonLoader label="Loading evaluation assessment" rows={4} variant="review" />;
}
