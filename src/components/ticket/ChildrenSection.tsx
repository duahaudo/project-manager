"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TicketModal } from "./TicketModal";
import { moveTicket, updateTicket } from "@/lib/actions/tickets";
import type { Ticket } from "@/lib/db/schema";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { midpoint } from "@/lib/rank";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

const TYPE_COLORS: Record<string, string> = {
  story: "bg-green-100 text-green-800",
  bug: "bg-red-100 text-red-800",
  task: "bg-blue-100 text-blue-800",
  epic: "bg-purple-100 text-purple-800",
};

function StatusDropdown({
  ticket,
  statuses,
  onStatusChange,
}: {
  ticket: Ticket;
  statuses: string[];
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="focus:outline-none"
        title="Change status"
      >
        <StatusBadge status={ticket.status} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded border border-zinc-200 bg-white shadow-lg">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onStatusChange(ticket.id, s);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50 ${s === ticket.status ? "font-semibold text-indigo-600" : "text-zinc-700"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableChild({
  child,
  projectKey,
  statuses,
  onOpen,
  onStatusChange,
}: {
  child: Ticket;
  projectKey: string;
  statuses: string[];
  onOpen: (ticket: Ticket) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: child.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-1">
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-zinc-400 hover:text-zinc-600 select-none"
        title="Drag to reorder"
      >
        ⠿
      </span>
      <div
        className="flex min-w-0 flex-1 items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm"
      >
        <button
          type="button"
          onClick={() => onOpen(child)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:bg-zinc-100 rounded"
        >
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[child.type] ?? "bg-zinc-200 text-zinc-700"}`}>
            {child.type}
          </span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs text-indigo-600">{child.key}</span>
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-zinc-700" title={child.title}>
            {child.title}
          </span>
        </button>
        <StatusDropdown ticket={child} statuses={statuses} onStatusChange={onStatusChange} />
      </div>
    </li>
  );
}

export function ChildrenSection({
  currentTicket,
  childTickets,
  projectKey,
  projectId,
  statuses,
  fieldValues,
  allTicketsForParent,
}: {
  currentTicket: Ticket;
  childTickets: Ticket[];
  projectKey: string;
  projectId: string;
  statuses: string[];
  fieldValues: FieldValues;
  allTicketsForParent?: Ticket[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Ticket | null>(null);
  const [items, setItems] = useState<Ticket[]>(childTickets);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleStatusChange(id: string, status: string) {
    setItems((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    startTransition(async () => {
      await updateTicket({ id, status });
      router.refresh();
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Compute new rank for moved item
    const before = reordered[newIndex - 1]?.rank ?? null;
    const after = reordered[newIndex + 1]?.rank ?? null;
    const newRank = midpoint(before, after);

    startTransition(async () => {
      await moveTicket({
        id: String(active.id),
        status: items[oldIndex].status,
        beforeId: reordered[newIndex - 1]?.id ?? null,
        afterId: reordered[newIndex + 1]?.id ?? null,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-500">Children</label>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No children</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {items.map((child) => (
                <SortableChild key={child.id} child={child} projectKey={projectKey} statuses={statuses} onOpen={setSelectedChild} onStatusChange={handleStatusChange} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="text-xs text-indigo-600 hover:underline"
      >
        + New Child Ticket
      </button>
      {showModal && (
        <TicketModal
          mode="create"
          ticket={null}
          projectId={projectId}
          projectKey={projectKey}
          statuses={statuses}
          fieldValues={fieldValues}
          allTickets={[]}
          allTicketsForParent={allTicketsForParent}
          defaultParentId={currentTicket.id}
          onClose={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
      {selectedChild && (
        <TicketModal
          mode="edit"
          ticket={selectedChild}
          projectId={projectId}
          projectKey={projectKey}
          statuses={statuses}
          fieldValues={fieldValues}
          allTickets={[]}
          allTicketsForParent={allTicketsForParent}
          onClose={() => {
            setSelectedChild(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
