"use client";
import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { CopyLinkButton } from "@/components/ticket/CopyLinkButton";
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
import { Filters, type FilterDef } from "@/components/board/Filters";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function SortableRow({ ticket, projectKey }: { ticket: Ticket; projectKey: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: ticket.id });
  // No CSS transform — transforms on <tr> are ignored by table layout.
  // DragOverlay handles visual feedback instead.
  return (
    <tr
      ref={setNodeRef}
      className="border-b hover:bg-indigo-50"
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <td
        className="py-2 w-8 cursor-grab text-zinc-400 text-center select-none touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </td>
      <td className="py-2 px-3 font-mono whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Link href={`/projects/${projectKey}/tickets/${ticket.key}?from=backlog`} className="text-indigo-600 whitespace-nowrap">
            {ticket.key}
          </Link>
          <CopyLinkButton path={`/projects/${projectKey}/tickets/${ticket.key}`} />
        </div>
      </td>
      <td className="px-3 max-w-[260px]">
        <span className="block truncate" title={ticket.title}>{ticket.title}</span>
      </td>
      <td className="px-3 whitespace-nowrap">{ticket.type}</td>
      <td className="px-3 whitespace-nowrap">{ticket.status}</td>
      <td className="px-3 whitespace-nowrap">{ticket.priority}</td>
      <td className="px-3 whitespace-nowrap">{ticket.phase ?? "—"}</td>
      <td className="px-3 whitespace-nowrap">{ticket.milestone ?? "—"}</td>
    </tr>
  );
}

function DragRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex items-center gap-3 rounded border border-indigo-300 bg-white px-3 py-2 shadow-lg text-sm w-[600px]">
      <span className="text-zinc-400">⠿</span>
      <span className="font-mono text-indigo-600 shrink-0">{ticket.key}</span>
      <span className="truncate text-zinc-900">{ticket.title}</span>
      <span className="ml-auto text-zinc-500 shrink-0">{ticket.status}</span>
    </div>
  );
}

export function BacklogClient({
  initialTickets,
  projectKey,
  filterDefs,
  initialFilters,
}: {
  initialTickets: Ticket[];
  projectKey: string;
  filterDefs: FilterDef[];
  initialFilters: Record<string, string | undefined>;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialFilters.q ?? "");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filtered = useMemo(() => {
    function getVals(key: string): string[] {
      const v = sp.get(key);
      if (!v) return [];
      return v.split(",").filter(Boolean);
    }
    return tickets.filter((t) => {
      const epics = getVals("epic");
      const phases = getVals("phase");
      const milestones = getVals("milestone");
      const sprints = getVals("sprint");
      const fixVersions = getVals("fixVersion");
      const statuses = getVals("status");
      const priorities = getVals("priority");
      const types = getVals("type");
      if (epics.length && !epics.includes(t.epicId ?? "")) return false;
      if (phases.length && !phases.includes(t.phase ?? "")) return false;
      if (milestones.length && !milestones.includes(t.milestone ?? "")) return false;
      if (sprints.length && !sprints.includes(t.sprint ?? "")) return false;
      if (fixVersions.length && !fixVersions.includes(t.fixVersion ?? "")) return false;
      if (statuses.length && !statuses.includes(t.status)) return false;
      if (priorities.length && !priorities.includes(t.priority ?? "")) return false;
      if (types.length && !types.includes(t.type)) return false;
      const q = sp.get("q");
      if (q) {
        const ql = q.toLowerCase();
        if (!t.title.toLowerCase().includes(ql) && !t.key.toLowerCase().includes(ql)) return false;
      }
      return true;
    });
  }, [tickets, sp]);

  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) ?? null : null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const fromIdx = tickets.findIndex((t) => t.id === active.id);
    const toIdx = tickets.findIndex((t) => t.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;

    const newTickets = arrayMove(tickets, fromIdx, toIdx);
    setTickets(newTickets);

    const before = newTickets[toIdx - 1] ?? null;
    const after = newTickets[toIdx + 1] ?? null;
    const moved = newTickets[toIdx];

    startTransition(async () => {
      await moveTicket({
        id: moved.id,
        status: moved.status,
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      });
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(sp.toString());
    if (search) next.set("q", search);
    else next.delete("q");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or key…"
            className="w-64 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <button type="submit" className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100">
            Search
          </button>
        </form>
        <Filters defs={filterDefs} storageKey={`backlog-filters-${projectKey}`} />
        <div className="text-xs text-zinc-500">{filtered.length} of {tickets.length} tickets</div>
      </div>
      <div className="overflow-x-auto">
        <DndContext
          id="backlog-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-zinc-500">
                <tr>
                  <th className="py-2 w-8"></th>
                  <th className="py-2 px-3 whitespace-nowrap">Key</th>
                  <th className="px-3">Title</th>
                  <th className="px-3 whitespace-nowrap">Type</th>
                  <th className="px-3 whitespace-nowrap">Status</th>
                  <th className="px-3 whitespace-nowrap">Priority</th>
                  <th className="px-3 whitespace-nowrap">Phase</th>
                  <th className="px-3 whitespace-nowrap">Milestone</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <SortableRow key={t.id} ticket={t} projectKey={projectKey} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500">
                      No tickets match filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeTicket ? <DragRow ticket={activeTicket} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
