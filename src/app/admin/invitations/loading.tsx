import { AppShell } from "@/components/layout/AppShell";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <AppShell>
      <SkeletonLoader label="Loading staff invitations" rows={5} variant="table" />
    </AppShell>
  );
}
