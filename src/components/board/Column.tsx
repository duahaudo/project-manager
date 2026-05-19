"use client";
import { useDroppable } from "@dnd-kit/core";
import { TicketCard } from "./TicketCard";
import type { Ticket } from "@/lib/db/schema";

export function Column({
  status,
  tickets,
  projectKey,
  onCardClick,
}: {
  status: string;
  tickets: Ticket[];
  projectKey: string;
  onCardClick?: (t: Ticket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[260px] sm:w-72 shrink-0 flex-col rounded-lg border bg-zinc-100 ${
        isOver ? "border-indigo-500 bg-indigo-50" : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700">
        <span className="truncate">{status}</span>
        <span className="text-zinc-500 text-xs ml-2">{tickets.length}</span>
      </div>
      <div className="flex min-h-24 flex-col gap-2 p-2">
        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            projectKey={projectKey}
            onClick={() => onCardClick?.(t)}
          />
        ))}
      </div>
    </div>
  );
}
