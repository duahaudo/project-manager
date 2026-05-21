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
}: {
  ticket: Ticket;
  projectId: string;
  projectKey: string;
  statuses: string[];
  fieldValues: FieldValues;
  allTickets: Ticket[];
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
      onClose={() => router.back()}
      onSaved={() => router.refresh()}
    />
  );
}
