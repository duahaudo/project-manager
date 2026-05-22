"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Project, Ticket } from "@/lib/db/schema";
import { TicketModal } from "@/components/ticket/TicketModal";
import { ColumnToggle } from "./ColumnToggle";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Filters, type FilterDef } from "@/components/board/Filters";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

const Board = dynamic(() => import("./Board").then((m) => m.Board), {
  ssr: false,
  loading: () => (
    <div className="flex h-full gap-3 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-full flex-1 min-w-[180px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-50" />
      ))}
    </div>
  ),
});

type OpenState = { mode: "edit"; ticket: Ticket } | null;

const LS_KEY = (projectKey: string) => `board-hidden-statuses-${projectKey}`;

export function BoardClient({
  project,
  tickets,
  fieldValues,
  allTickets,
  epicTickets = [],
  initialSearch = "",
  filterDefs = [],
}: {
  project: Project;
  tickets: Ticket[];
  fieldValues: FieldValues;
  allTickets: Ticket[];
  epicTickets?: Ticket[];
  initialSearch?: string;
  filterDefs?: FilterDef[];
}) {
  const [open, setOpen] = useState<OpenState>(null);
  const [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY(project.key));
      if (stored) setHiddenStatuses(JSON.parse(stored));
    } catch {}
  }, [project.key]);

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

  function toggleStatus(status: string) {
    setHiddenStatuses((prev) => {
      const next = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status];
      try { localStorage.setItem(LS_KEY(project.key), JSON.stringify(next)); } catch {}
      return next;
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
    <div className="flex h-full flex-col">
      <div className="mb-3 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or key…"
              className="w-48 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Search
            </button>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <ColumnToggle
              statuses={project.statuses}
              hidden={hiddenStatuses}
              onToggle={toggleStatus}
            />
            <RefreshButton />
          </div>
        </div>
        {filterDefs.length > 0 && (
          <Filters defs={filterDefs} storageKey={`board-filters-${project.key}`} />
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Board
          project={project}
          tickets={tickets}
          hiddenStatuses={hiddenStatuses}
          onCardClick={(t) => setOpen({ mode: "edit", ticket: t })}
        />
      </div>
      {open && (
        <TicketModal
          mode="edit"
          ticket={open.ticket}
          projectId={project.id}
          projectKey={project.key}
          statuses={project.statuses}
          fieldValues={fieldValues}
          allTickets={allTickets}
          allTicketsForParent={[...allTickets, ...epicTickets]}
          onClose={close}
        />
      )}
    </div>
  );
}
