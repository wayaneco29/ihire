import { PageHeader } from "@/components/ui/PageHeader";
import { PostingForm } from "../components/PostingForm";

export default function NewPostingPage() {
  return <>
    <PageHeader description="Add the position, requirements, application deadline, and available slots." eyebrow="HR workspace" title="Create job posting" />
    <PostingForm />
  </>;
}
