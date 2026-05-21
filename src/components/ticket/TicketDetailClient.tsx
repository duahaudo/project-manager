"use client";
import { useRouter } from "next/navigation";
import { TicketForm } from "./TicketForm";
import type { Ticket } from "@/lib/db/schema";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

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
}) {
  const router = useRouter();
  return (
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
  );
}
