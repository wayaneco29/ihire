"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "antd";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

type PostingItem = {
  id: string; title: string; description: string; slots: number; status: string;
  deadline: string | null; created_at: string; total: number; qualified: number; hired: number;
};

export function PostingsManager({ postings }: Readonly<{ postings: PostingItem[] }>) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return postings.filter((posting) => (!term || posting.title.toLocaleLowerCase().includes(term)) && (status === "ALL" || posting.status === status));
  }, [postings, search, status]);

  return <section className="mt-7">
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
      <label><span className="sr-only">Search job postings</span><Input aria-label="Search job postings" onChange={(event) => setSearch(event.target.value)} placeholder="Search job titles" value={search} /></label>
      <label><span className="sr-only">Filter by posting status</span><select className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
    </div>
    {filtered.length ? <ul className="grid gap-4 lg:grid-cols-2">{filtered.map((posting) => <li className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" key={posting.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold text-ink">{posting.title}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{posting.description}</p></div><WorkflowStatusTag status={posting.status} /></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><Metric label="Applicants" value={posting.total} /><Metric label="Qualified / total" value={`${posting.qualified} / ${posting.total}`} /><Metric label="Hired" value={`${posting.hired} / ${posting.slots}`} /><Metric label="Deadline" value={posting.deadline ? formatDate(posting.deadline) : "None"} /></dl>
      <div className="mt-5 flex flex-wrap gap-3"><Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark" href={`/hr/postings/${posting.id}`}>View applicants</Link><Link className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink hover:bg-slate-50" href={`/hr/postings/${posting.id}/edit`}>Edit posting</Link></div>
    </li>)}</ul> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted">No postings match these filters.</div>}
  </section>;
}

function Metric({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold text-ink">{value}</dd></div>;
}
