"use client";
import { useState, useMemo, useTransition, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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

  // Sync local state when server data refreshes (after save/delete in modal).
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

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    const overId = String(over.id);
    let targetStatus: string;
    let targetIndex: number;
    const colList = (s: string) => byStatus.get(s) ?? [];

    if (project.statuses.includes(overId)) {
      targetStatus = overId;
      targetIndex = colList(targetStatus).length;
    } else {
      const overTicket = tickets.find((t) => t.id === overId);
      if (!overTicket) return;
      targetStatus = overTicket.status;
      const list = colList(targetStatus);
      targetIndex = list.findIndex((t) => t.id === overTicket.id);
      if (targetIndex < 0) targetIndex = list.length;
    }

    const targetList = colList(targetStatus).filter((t) => t.id !== activeTicket.id);
    const before = targetList[targetIndex - 1] ?? null;
    const after = targetList[targetIndex] ?? null;

    setTickets((prev) =>
      prev.map((t) => (t.id === activeTicket.id ? { ...t, status: targetStatus } : t))
    );
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
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
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
