"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketModal } from "./TicketModal";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

export function NewTicketButton({
  projectId,
  projectKey,
  statuses,
  fieldValues,
}: {
  projectId: string;
  projectKey: string;
  statuses: string[];
  fieldValues: FieldValues;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + New Ticket
      </button>
      {open && (
        <TicketModal
          mode="create"
          ticket={null}
          projectId={projectId}
          projectKey={projectKey}
          statuses={statuses}
          fieldValues={fieldValues}
          allTickets={[]}
          onClose={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}
