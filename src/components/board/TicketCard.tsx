"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "@/lib/db/schema";

const typeColor: Record<string, string> = {
  story: "bg-green-500",
  bug: "bg-red-500",
  task: "bg-blue-500",
  epic: "bg-purple-500",
};

const priorityLabel: Record<string, string> = {
  lowest: "↓↓",
  low: "↓",
  med: "=",
  high: "↑",
  highest: "↑↑",
};

export function TicketCard({
  ticket,
  projectKey,
  dragging,
  onClick,
}: {
  ticket: Ticket;
  projectKey: string;
  dragging?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onClick?.();
      }}
      className={`group cursor-pointer rounded-md border border-zinc-200 bg-white p-2 shadow-sm hover:border-indigo-400 ${
        dragging ? "rotate-2 cursor-grabbing shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${typeColor[ticket.type] ?? "bg-zinc-400"}`} />
        <span className="font-mono text-zinc-500">{ticket.key}</span>
        <span className="ml-auto text-zinc-400">{priorityLabel[ticket.priority]}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-900">{ticket.title}</p>
      {(ticket.phase || ticket.milestone || ticket.sprint) && (
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-600">
          {ticket.phase && <span className="rounded bg-zinc-100 px-1">P:{ticket.phase}</span>}
          {ticket.milestone && <span className="rounded bg-zinc-100 px-1">M:{ticket.milestone}</span>}
          {ticket.sprint && <span className="rounded bg-zinc-100 px-1">S:{ticket.sprint}</span>}
        </div>
      )}
    </div>
  );
}
