import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { getTicketByKey, listAllTicketsByProject, listTicketsByProjectWithJira, listFieldValues, getParentTicket, getChildTickets } from "@/lib/actions/tickets";
import { getJiraConfig } from "@/lib/db/schema";
import { fetchJiraIssue } from "@/lib/jira/client";
import { mapJiraIssueToTicket } from "@/lib/jira/mappers";
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

  const jiraConfig = getJiraConfig(project);
  let ticket;
  let jiraComments: Array<{ id: string; author: string; body: string; createdAt: Date }> = [];
  if (jiraConfig) {
    const issue = await fetchJiraIssue(
      { baseUrl: jiraConfig.baseUrl, email: jiraConfig.email, apiToken: jiraConfig.apiToken },
      ticketKey
    );
    ticket = {
      ...mapJiraIssueToTicket(issue, project.id, jiraConfig.statusMap),
      rank: "0",
      updatedAt: new Date(issue.fields.updated),
    };
    const { fetchJiraComments } = await import("@/lib/jira/client");
    const { adfToMarkdown } = await import("@/lib/jira/adf-to-markdown");
    const rawComments = await fetchJiraComments(
      { baseUrl: jiraConfig.baseUrl, email: jiraConfig.email, apiToken: jiraConfig.apiToken },
      ticketKey
    );
    jiraComments = rawComments.map((c) => ({
      id: c.id,
      author: c.author.displayName,
      body: c.body ? adfToMarkdown(c.body as import("@/lib/jira/types").AdfDocument) : "",
      createdAt: new Date(c.created),
    }));
  } else {
    ticket = await getTicketByKey(ticketKey);
    if (!ticket) notFound();
  }

  const allTickets = jiraConfig
    ? await listTicketsByProjectWithJira(project)
    : await listAllTicketsByProject(project.id);

  const [fieldValues, parentTicket, childTickets] = await Promise.all([
    listFieldValues(project.id),
    jiraConfig ? Promise.resolve(null) : getParentTicket(ticket.parentId),
    jiraConfig ? Promise.resolve([]) : getChildTickets(ticket.id, ticket.type),
  ]);

  const allTicketsForParent = allTickets;

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
          jiraComments={jiraComments}
        />
      </div>
    </div>
    </div>
  );
}
