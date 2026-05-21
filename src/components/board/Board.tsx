"use client";
import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { TicketCard } from "./TicketCard";
import type { Project, Ticket } from "@/lib/db/schema";
import { moveTicket } from "@/lib/actions/tickets";

export function Board({
  project,
  tickets: initial,
  hiddenStatuses = [],
  onCardClick,
}: {
  project: Project;
  tickets: Ticket[];
  hiddenStatuses?: string[];
  onCardClick?: (t: Ticket) => void;
}) {
  const [tickets, setTickets] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // snapshot before drag so we can compute before/after for server call
  const snapshotRef = useRef<Ticket[]>([]);

  useEffect(() => {
    setTickets(initial);
  }, [initial]);

  const byStatus = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const s of project.statuses) map.set(s, []);
    for (const t of [...tickets].sort((a, b) => (a.rank < b.rank ? -1 : 1))) {
      if (!map.has(t.status)) map.set(t.status, []);
      map.get(t.status)!.push(t);
    }
    return map;
  }, [tickets, project.statuses]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const active = activeId ? tickets.find((t) => t.id === activeId) : null;

  const collisionDetection: CollisionDetection = (args) => {
    // pointerWithin catches droppable column containers (works on empty columns)
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    // fall back to closestCenter for card-level precision
    return closestCenter(args);
  };

  function getStatus(id: string): string | null {
    if (project.statuses.includes(id)) return id;
    return tickets.find((t) => t.id === id)?.status ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    snapshotRef.current = tickets;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeStatus = getStatus(activeId);
    const overStatus = getStatus(overId);
    if (!activeStatus || !overStatus) return;

    setTickets((prev) => {
      const activeTicket = prev.find((t) => t.id === activeId);
      if (!activeTicket) return prev;

      // Change status if crossing columns
      const withStatus = activeTicket.status !== overStatus
        ? prev.map((t) => t.id === activeId ? { ...t, status: overStatus } : t)
        : prev;

      // Reorder within the target column
      const col = withStatus
        .filter((t) => t.status === overStatus)
        .sort((a, b) => (a.rank < b.rank ? -1 : 1));

      const fromIdx = col.findIndex((t) => t.id === activeId);
      // over is a column id → put at end; over is a card → put at that card's index
      const toIdx = project.statuses.includes(overId)
        ? col.length - 1
        : col.findIndex((t) => t.id === overId);

      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return withStatus;

      const reordered = arrayMove(col, fromIdx, toIdx);
      const colIds = new Set(reordered.map((t) => t.id));
      const rest = withStatus.filter((t) => !colIds.has(t.id));
      return [...rest, ...reordered];
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) {
      setTickets(snapshotRef.current);
      return;
    }

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    const targetStatus = activeTicket.status;
    // Do NOT sort by rank here — optimistic state from onDragOver already has correct visual order
    const col = tickets.filter((t) => t.status === targetStatus);
    const idx = col.findIndex((t) => t.id === activeTicket.id);
    const before = col[idx - 1] ?? null;
    const after = col[idx + 1] ?? null;

    startTransition(async () => {
      await moveTicket({
        id: activeTicket.id,
        status: targetStatus,
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      });
    });
  }

  return (
    <DndContext
      id="board-dnd"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-6 sm:px-6">
        {project.statuses.filter((s) => !hiddenStatuses.includes(s)).map((status) => {
          const items = byStatus.get(status) ?? [];
          return (
            <SortableContext
              key={status}
              id={status}
              items={items.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <Column status={status} tickets={items} projectKey={project.key} onCardClick={onCardClick} />
            </SortableContext>
          );
        })}
      </div>
      <DragOverlay>
        {active ? <TicketCard ticket={active} projectKey={project.key} dragging onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
