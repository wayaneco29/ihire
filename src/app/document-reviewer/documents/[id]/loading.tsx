import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return <SkeletonLoader label="Loading document review" rows={4} variant="review" />;
}
