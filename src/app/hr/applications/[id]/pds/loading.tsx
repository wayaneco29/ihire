import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <SkeletonLoader
      label="Loading printable personal data sheet"
      rows={4}
      showAction
      variant="profile"
    />
  );
}
