import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject, listEpicTicketsByProject, listFieldValues } from "@/lib/actions/tickets";
import { BoardClient } from "@/components/board/BoardClient";
import { type FilterDef } from "@/components/board/Filters";

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

export default async function BoardPage({
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
  const epics = await listEpicTicketsByProject(project.id);
  const fieldValues = await listFieldValues(project.id);

  function getVals(param: string | undefined): string[] {
    if (!param) return [];
    return param.split(",").filter(Boolean);
  }

  const filtered = all.filter((t) => {
    const epics = getVals(sp.epic);
    const phases = getVals(sp.phase);
    const milestones = getVals(sp.milestone);
    const sprints = getVals(sp.sprint);
    const fixVersions = getVals(sp.fixVersion);
    const priorities = getVals(sp.priority);
    const types = getVals(sp.type);
    if (epics.length && !epics.includes(t.epicId ?? "")) return false;
    if (phases.length && !phases.includes(t.phase ?? "")) return false;
    if (milestones.length && !milestones.includes(t.milestone ?? "")) return false;
    if (sprints.length && !sprints.includes(t.sprint ?? "")) return false;
    if (fixVersions.length && !fixVersions.includes(t.fixVersion ?? "")) return false;
    if (priorities.length && !priorities.includes(t.priority ?? "")) return false;
    if (types.length && !types.includes(t.type)) return false;
    if (sp.q) {
      const q = sp.q.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const defs: FilterDef[] = [
    {
      key: "epic",
      label: "Epic",
      options: epics.map((e) => ({ value: e.id, label: e.title })),
    },
    { key: "phase", label: "Phase", options: uniq(all.map((t) => t.phase)).map((v) => ({ value: v, label: v })) },
    { key: "milestone", label: "Milestone", options: uniq(all.map((t) => t.milestone)).map((v) => ({ value: v, label: v })) },
    { key: "sprint", label: "Sprint", options: uniq(all.map((t) => t.sprint)).map((v) => ({ value: v, label: v })) },
    { key: "fixVersion", label: "Fix Version", options: uniq(all.map((t) => t.fixVersion)).map((v) => ({ value: v, label: v })) },
    { key: "priority", label: "Priority", options: PRIORITY_OPTS },
    { key: "type", label: "Type", options: TYPE_OPTS },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 pt-4 sm:px-6 sm:pt-4">
      <div className="flex-1 min-h-0">
        <BoardClient project={project} tickets={filtered} fieldValues={fieldValues} allTickets={all} initialSearch={sp.q ?? ""} filterDefs={defs} />
      </div>
    </div>
  );
}
