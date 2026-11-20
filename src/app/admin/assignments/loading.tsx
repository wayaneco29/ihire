import { AppShell } from "@/components/layout/AppShell";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <AppShell>
      <SkeletonLoader label="Loading evaluator assignments" rows={6} variant="table" />
    </AppShell>
  );
}
