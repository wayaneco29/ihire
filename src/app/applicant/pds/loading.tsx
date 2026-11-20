import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading personal data sheet"
      rows={4}
      showAction
      variant="profile"
    />
  );
}
