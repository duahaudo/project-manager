import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { listEpicTicketsByProject, listTicketsByProject } from "@/lib/actions/tickets";
import { EpicsClient } from "@/components/epics/EpicsClient";

export default async function EpicsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [epics, tickets] = await Promise.all([
    listEpicTicketsByProject(project.id),
    listTicketsByProject(project.id),
  ]);

  const childCountByEpicId: Record<string, number> = {};
  for (const t of tickets) {
    if (t.epicId) {
      childCountByEpicId[t.epicId] = (childCountByEpicId[t.epicId] ?? 0) + 1;
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 pt-4 sm:px-6 sm:pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Epics</h1>
      </div>
      <EpicsClient
        initialEpics={epics}
        projectKey={key}
        childCountByEpicId={childCountByEpicId}
      />
    </div>
  );
}
