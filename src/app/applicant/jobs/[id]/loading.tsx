import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return <SkeletonLoader label="Loading position details" rows={4} variant="detail" />;
}
