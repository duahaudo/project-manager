import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject, listEpicsByProject } from "@/lib/actions/tickets";
import { Filters, type FilterDef } from "@/components/board/Filters";

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

  const tickets = all.filter((t) => {
    if (sp.epic && (t.epicId ?? "") !== sp.epic) return false;
    if (sp.phase && (t.phase ?? "") !== sp.phase) return false;
    if (sp.milestone && (t.milestone ?? "") !== sp.milestone) return false;
    if (sp.sprint && (t.sprint ?? "") !== sp.sprint) return false;
    if (sp.fixVersion && (t.fixVersion ?? "") !== sp.fixVersion) return false;
    if (sp.status && t.status !== sp.status) return false;
    if (sp.priority && t.priority !== sp.priority) return false;
    if (sp.type && t.type !== sp.type) return false;
    if (sp.q) {
      const q = sp.q.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
    }
    return true;
  });

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
    <div>
      <div className="mb-4 space-y-2">
        <form method="get" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search title or key…"
            className="w-64 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          {Object.entries(sp)
            .filter(([k]) => k !== "q")
            .map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <button type="submit" className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100">
            Search
          </button>
        </form>
        <Filters defs={defs} />
        <div className="text-xs text-zinc-500">{tickets.length} of {all.length} tickets</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-zinc-500">
            <tr>
              <th className="py-2">Key</th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Phase</th>
              <th>Milestone</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b hover:bg-indigo-50">
                <td className="py-2 font-mono">
                  <Link href={`/projects/${key}/tickets/${t.key}`} className="text-indigo-600">
                    {t.key}
                  </Link>
                </td>
                <td>{t.title}</td>
                <td>{t.type}</td>
                <td>{t.status}</td>
                <td>{t.priority}</td>
                <td>{t.phase ?? "—"}</td>
                <td>{t.milestone ?? "—"}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500">
                  No tickets match filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
