"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Project, Ticket } from "@/lib/db/schema";
import { TicketModal } from "@/components/ticket/TicketModal";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

// dnd-kit generates incremental aria-describedby IDs that mismatch between SSR/CSR.
// Render Board only on client to avoid hydration warnings.
const Board = dynamic(() => import("./Board").then((m) => m.Board), {
  ssr: false,
  loading: () => (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-32 w-72 shrink-0 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
        />
      ))}
    </div>
  ),
});

type OpenState = { mode: "create" } | { mode: "edit"; ticket: Ticket } | null;

export function BoardClient({
  project,
  tickets,
  fieldValues,
  allTickets,
}: {
  project: Project;
  tickets: Ticket[];
  fieldValues: FieldValues;
  allTickets: Ticket[];
}) {
  const [open, setOpen] = useState<OpenState>(null);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  // Deep-link support: ?ticket=KEY opens edit modal.
  useEffect(() => {
    const k = sp.get("ticket");
    if (!k) return;
    const t = ticketsRef.current.find((x) => x.key === k);
    if (t) setOpen({ mode: "edit", ticket: t });
  }, [sp]);

  function close() {
    setOpen(null);
    if (sp.get("ticket")) {
      const next = new URLSearchParams(sp.toString());
      next.delete("ticket");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setOpen({ mode: "create" })}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + New Ticket
        </button>
      </div>
      <Board project={project} tickets={tickets} onCardClick={(t) => setOpen({ mode: "edit", ticket: t })} />
      {open && (
        <TicketModal
          mode={open.mode}
          ticket={open.mode === "edit" ? open.ticket : null}
          projectId={project.id}
          projectKey={project.key}
          statuses={project.statuses}
          fieldValues={fieldValues}
          allTickets={allTickets}
          onClose={close}
        />
      )}
    </>
  );
}
