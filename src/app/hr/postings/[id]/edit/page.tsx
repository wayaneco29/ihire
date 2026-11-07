import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { PostingForm } from "../../components/PostingForm";

export default async function EditPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/login");
  const { data: posting, error } = await hr.supabase.from("job_postings")
    .select("id, title, description, requirements, slots, status, deadline")
    .eq("id", id)
    .maybeSingle();
  if (error || !posting) notFound();

  return <>
    <PageHeader description="Update the position details and manage its open, draft, or closed status." eyebrow="HR workspace" title="Edit job posting" />
    <PostingForm posting={{ ...posting, requirements: posting.requirements ?? "", deadline: posting.deadline ?? "" }} />
  </>;
}
