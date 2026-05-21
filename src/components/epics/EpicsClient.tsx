"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Ticket } from "@/lib/db/schema";
import { moveTicket } from "@/lib/actions/tickets";

function SortableRow({
  epic,
  projectKey,
  childCount,
}: {
  epic: Ticket;
  projectKey: string;
  childCount: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: epic.id });
  return (
    <tr
      ref={setNodeRef}
      className="border-b border-zinc-100 hover:bg-zinc-50"
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <td
        className="py-2 w-8 cursor-grab text-zinc-400 text-center select-none touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </td>
      <td className="py-2 pr-4">
        <Link
          href={`/projects/${projectKey}/epics/${epic.key}?from=epics`}
          className="font-mono text-xs text-indigo-600 hover:underline"
        >
          {epic.key}
        </Link>
      </td>
      <td className="py-2 pr-4">
        <Link
          href={`/projects/${projectKey}/epics/${epic.key}?from=epics`}
          className="text-zinc-800 hover:underline"
        >
          {epic.title}
        </Link>
      </td>
      <td className="py-2 pr-4 text-zinc-600">{epic.status}</td>
      <td className="py-2 pr-4 text-zinc-600">{epic.priority}</td>
      <td className="py-2 pr-4 text-zinc-500">{childCount}</td>
    </tr>
  );
}

function DragRow({ epic }: { epic: Ticket }) {
  return (
    <div className="flex items-center gap-3 rounded border border-indigo-300 bg-white px-3 py-2 shadow-lg text-sm w-[600px]">
      <span className="text-zinc-400">⠿</span>
      <span className="font-mono text-indigo-600 shrink-0">{epic.key}</span>
      <span className="truncate text-zinc-900">{epic.title}</span>
      <span className="ml-auto text-zinc-500 shrink-0">{epic.status}</span>
    </div>
  );
}

export function EpicsClient({
  initialEpics,
  projectKey,
  childCountByEpicId,
}: {
  initialEpics: Ticket[];
  projectKey: string;
  childCountByEpicId: Record<string, number>;
}) {
  const [epics, setEpics] = useState(initialEpics);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeEpic = activeId ? epics.find((e) => e.id === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const fromIdx = epics.findIndex((e) => e.id === active.id);
    const toIdx = epics.findIndex((e) => e.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;

    const newEpics = arrayMove(epics, fromIdx, toIdx);
    setEpics(newEpics);

    const before = newEpics[toIdx - 1] ?? null;
    const after = newEpics[toIdx + 1] ?? null;
    const moved = newEpics[toIdx];

    startTransition(async () => {
      await moveTicket({
        id: moved.id,
        status: moved.status,
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      });
    });
  }

  if (epics.length === 0) {
    return (
      <p className="text-sm text-zinc-500 italic">No epics yet. Create a ticket with type &ldquo;epic&rdquo;.</p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="pb-2 w-8" />
              <th className="pb-2 pr-4 font-medium">Key</th>
              <th className="pb-2 pr-4 font-medium">Title</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Priority</th>
              <th className="pb-2 pr-4 font-medium">Children</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={epics.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {epics.map((epic) => (
                <SortableRow
                  key={epic.id}
                  epic={epic}
                  projectKey={projectKey}
                  childCount={childCountByEpicId[epic.id] ?? 0}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
      <DragOverlay>
        {activeEpic && <DragRow epic={activeEpic} />}
      </DragOverlay>
    </DndContext>
  );
}
