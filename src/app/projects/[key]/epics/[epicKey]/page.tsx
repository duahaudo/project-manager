import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectByKey } from "@/lib/actions/projects";
import {
  getTicketByKey,
  listAllTicketsByProject,
  listFieldValues,
  getChildTickets,
} from "@/lib/actions/tickets";
import { TicketDetailClient } from "@/components/ticket/TicketDetailClient";
import { CopyLinkButton } from "@/components/ticket/CopyLinkButton";

export default async function EpicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; epicKey: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { key, epicKey } = await params;
  const { from } = await searchParams;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const ticket = await getTicketByKey(epicKey);
  if (!ticket || ticket.type !== "epic") notFound();

  const [allTicketsForParent, fieldValues, childTickets] = await Promise.all([
    listAllTicketsByProject(project.id),
    listFieldValues(project.id),
    getChildTickets(ticket.id, ticket.type),
  ]);

  const epicUrl = `/projects/${key}/epics/${epicKey}`;
  const backHref = from === "epics" ? `/projects/${key}/epics` : `/projects/${key}/board`;
  const backLabel = from === "epics" ? "← Epics" : "← Board";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-3">
          <Link href={backHref} className="text-sm text-zinc-500 hover:underline">
            {backLabel}
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="font-mono text-sm text-indigo-600">{epicKey}</span>
          <CopyLinkButton path={epicUrl} />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <TicketDetailClient
            ticket={ticket}
            projectId={project.id}
            projectKey={key}
            statuses={project.statuses}
            fieldValues={fieldValues}
            allTickets={allTicketsForParent}
            parentTicket={null}
            childTickets={childTickets}
            disableTypeChange={true}
            allTicketsForParent={allTicketsForParent}
          />
        </div>
      </div>
    </div>
  );
}
