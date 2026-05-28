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

function StatusFilterDropdown({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function toggle(val: string) {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  }

  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${
          active
            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
            : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        <span className="text-zinc-400 mr-0.5">Status</span>
        <span className="font-medium">
          {active
            ? selected.length === 1 ? selected[0] : `${selected.length} selected`
            : "All"}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-0.5 opacity-50">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[150px] rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.map((s) => (
              <li key={s}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-zinc-50">
                  <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} className="accent-indigo-600" />
                  <span className="text-sm text-zinc-800">{s}</span>
                </label>
              </li>
            ))}
          </ul>
          {active && (
            <div className="border-t border-zinc-100 px-3 py-1.5">
              <button type="button" onClick={() => { onChange([]); setOpen(false); }} className="text-xs text-zinc-500 hover:text-zinc-800">
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

function ChildItemContent({
  child,
  statuses,
  onOpen,
  onStatusChange,
}: {
  child: Ticket;
  statuses: string[];
  onOpen: (ticket: Ticket) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm">
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
  );
}

function ChildItem({
  child,
  statuses,
  onOpen,
  onStatusChange,
}: {
  child: Ticket;
  statuses: string[];
  onOpen: (ticket: Ticket) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <li className="flex items-center gap-1">
      <span className="px-1 text-zinc-300 select-none">⠿</span>
      <ChildItemContent child={child} statuses={statuses} onOpen={onOpen} onStatusChange={onStatusChange} />
    </li>
  );
}

function SortableChild({
  child,
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
      <ChildItemContent child={child} statuses={statuses} onOpen={onOpen} onStatusChange={onStatusChange} />
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const uniqueStatuses = Array.from(new Set(items.map((t) => t.status)));

  const filteredItems = items.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const inTitle = t.title.toLowerCase().includes(q);
      const inDesc = (t.description ?? "").toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) return false;
    return true;
  });

  const isFiltered = searchQuery.trim() !== "" || selectedStatuses.length > 0;

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
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or description…"
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {uniqueStatuses.length > 1 && (
            <StatusFilterDropdown
              options={uniqueStatuses}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
            />
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No children</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No children match filter</p>
      ) : isFiltered ? (
        <ul className="space-y-1">
          {filteredItems.map((child) => (
            <ChildItem key={child.id} child={child} statuses={statuses} onOpen={setSelectedChild} onStatusChange={handleStatusChange} />
          ))}
        </ul>
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
          allTickets={allTicketsForParent ?? []}
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
