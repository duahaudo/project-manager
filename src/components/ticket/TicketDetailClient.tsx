"use client";
import { useRouter } from "next/navigation";
import { TicketForm } from "./TicketForm";
import type { Ticket } from "@/lib/db/schema";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

type JiraCommentItem = {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
};

export function TicketDetailClient({
  ticket,
  projectId,
  projectKey,
  statuses,
  fieldValues,
  allTickets,
  parentTicket,
  childTickets,
  disableTypeChange,
  allTicketsForParent,
  jiraComments,
}: {
  ticket: Ticket;
  projectId: string;
  projectKey: string;
  statuses: string[];
  fieldValues: FieldValues;
  allTickets: Ticket[];
  parentTicket: Ticket | null;
  childTickets: Ticket[];
  disableTypeChange?: boolean;
  allTicketsForParent: Ticket[];
  jiraComments?: JiraCommentItem[];
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-6">
      <TicketForm
        mode="edit"
        ticket={ticket}
        projectId={projectId}
        projectKey={projectKey}
        statuses={statuses}
        fieldValues={fieldValues}
        allTickets={allTickets}
        parentTicket={parentTicket}
        childTickets={childTickets}
        disableTypeChange={disableTypeChange}
        allTicketsForParent={allTicketsForParent}
        onClose={() => router.back()}
        onSaved={() => router.refresh()}
      />
      {jiraComments && jiraComments.length > 0 && (
        <div className="border-t border-zinc-200 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700 mb-2">
            JIRA Comments ({jiraComments.length})
          </h3>
          <div className="flex flex-col gap-4">
            {jiraComments.map((comment) => (
              <div key={comment.id} className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-zinc-800">{comment.author}</span>
                  <span className="text-xs text-zinc-500">
                    {comment.createdAt.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-zinc-700 whitespace-pre-wrap">{comment.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
