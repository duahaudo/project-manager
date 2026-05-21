import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectByKey } from "@/lib/actions/projects";
import { getTicketByKey, listTicketsByProject, listFieldValues } from "@/lib/actions/tickets";
import { TicketDetailClient } from "@/components/ticket/TicketDetailClient";
import { CopyLinkButton } from "@/components/ticket/CopyLinkButton";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ key: string; ticketKey: string }>;
}) {
  const { key, ticketKey } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const ticket = await getTicketByKey(ticketKey);
  if (!ticket) notFound();

  const [allTickets, fieldValues] = await Promise.all([
    listTicketsByProject(project.id),
    listFieldValues(project.id),
  ]);

  const ticketUrl = `/projects/${key}/tickets/${ticketKey}`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/projects/${key}/board`} className="text-sm text-zinc-500 hover:underline">
          ← Board
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-mono text-sm text-indigo-600">{ticketKey}</span>
        <CopyLinkButton path={ticketUrl} />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <TicketDetailClient
          ticket={ticket}
          projectId={project.id}
          projectKey={key}
          statuses={project.statuses}
          fieldValues={fieldValues}
          allTickets={allTickets}
        />
      </div>
    </div>
    </div>
  );
}
