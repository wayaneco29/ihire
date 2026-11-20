import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading job postings"
      rows={5}
      showAction
      variant="table"
    />
  );
}
