import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-7">
      <SkeletonLoader label="Loading your workspace" rows={3} />
    </div>
  );
}
