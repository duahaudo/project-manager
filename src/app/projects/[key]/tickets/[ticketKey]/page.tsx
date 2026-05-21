import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { getTicketByKey, listAllTicketsByProject, listFieldValues, getParentTicket, getChildTickets } from "@/lib/actions/tickets";
import { TicketDetailClient } from "@/components/ticket/TicketDetailClient";
import { CopyLinkButton } from "@/components/ticket/CopyLinkButton";
import { BackButton } from "@/components/ticket/BackButton";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; ticketKey: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { key, ticketKey } = await params;
  const { from } = await searchParams;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const ticket = await getTicketByKey(ticketKey);
  if (!ticket) notFound();

  const [allTicketsForParent, fieldValues, parentTicket, childTickets] = await Promise.all([
    listAllTicketsByProject(project.id),
    listFieldValues(project.id),
    getParentTicket(ticket.parentId, ticket.epicId),
    getChildTickets(ticket.id),
  ]);

  const ticketUrl = `/projects/${key}/tickets/${ticketKey}`;
  const backLabel = from === "backlog" ? "← Backlog" : "← Board";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        {from && <BackButton label={backLabel} />}
        {from && <span className="text-zinc-300">/</span>}
        <span className="font-mono text-sm text-indigo-600">{ticketKey}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${{
          story: "bg-green-500",
          bug: "bg-red-500",
          task: "bg-blue-500",
          epic: "bg-purple-500",
        }[ticket.type] ?? "bg-zinc-400"}`}>
          {ticket.type}
        </span>
        <CopyLinkButton path={ticketUrl} />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <TicketDetailClient
          ticket={ticket}
          projectId={project.id}
          projectKey={key}
          statuses={project.statuses}
          fieldValues={fieldValues}
          allTickets={allTicketsForParent}
          parentTicket={parentTicket}
          childTickets={childTickets}
          allTicketsForParent={allTicketsForParent}
        />
      </div>
    </div>
    </div>
  );
}
