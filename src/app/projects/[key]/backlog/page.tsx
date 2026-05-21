import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject, listEpicsByProject } from "@/lib/actions/tickets";
import { type FilterDef } from "@/components/board/Filters";
import { BacklogClient } from "@/components/backlog/BacklogClient";

const PRIORITY_OPTS = [
  { value: "highest", label: "Highest" },
  { value: "high", label: "High" },
  { value: "med", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "lowest", label: "Lowest" },
];

const TYPE_OPTS = [
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "epic", label: "Epic" },
];

function uniq(arr: (string | null | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((v): v is string => !!v))).sort();
}

export default async function BacklogPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const all = await listTicketsByProject(project.id);
  const epics = await listEpicsByProject(project.id);

  const defs: FilterDef[] = [
    { key: "epic", label: "Epic", options: epics.map((e) => ({ value: e.id, label: e.title })) },
    { key: "status", label: "Status", options: project.statuses.map((s) => ({ value: s, label: s })) },
    { key: "type", label: "Type", options: TYPE_OPTS },
    { key: "priority", label: "Priority", options: PRIORITY_OPTS },
    { key: "phase", label: "Phase", options: uniq(all.map((t) => t.phase)).map((v) => ({ value: v, label: v })) },
    { key: "milestone", label: "Milestone", options: uniq(all.map((t) => t.milestone)).map((v) => ({ value: v, label: v })) },
    { key: "sprint", label: "Sprint", options: uniq(all.map((t) => t.sprint)).map((v) => ({ value: v, label: v })) },
    { key: "fixVersion", label: "Fix Version", options: uniq(all.map((t) => t.fixVersion)).map((v) => ({ value: v, label: v })) },
  ];

  return (
    <BacklogClient
      initialTickets={all}
      projectKey={key}
      filterDefs={defs}
      initialFilters={sp}
    />
  );
}
