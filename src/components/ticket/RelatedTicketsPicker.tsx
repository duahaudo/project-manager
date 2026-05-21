"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Ticket } from "@/lib/db/schema";

export function RelatedTicketsPicker({
  value,
  onChange,
  allTickets,
  currentTicketId,
  projectKey,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  allTickets: Ticket[];
  currentTicketId?: string;
  projectKey: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const rawCandidates = allTickets.filter((t) => {
    if (t.id === currentTicketId) return false;
    if (value.includes(t.id)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
  });

  const currentProjectPrefix = projectKey + "-";
  const currentGroup = rawCandidates.filter((t) => t.key.startsWith(currentProjectPrefix));
  const otherGroup = rawCandidates.filter((t) => !t.key.startsWith(currentProjectPrefix));

  type ListItem = { type: "ticket"; ticket: Ticket } | { type: "label"; label: string };
  const candidates: ListItem[] = [
    ...currentGroup.map((t): ListItem => ({ type: "ticket", ticket: t })),
    ...(otherGroup.length > 0 && currentGroup.length > 0
      ? [{ type: "label", label: "Other projects" } as ListItem]
      : []),
    ...otherGroup.map((t): ListItem => ({ type: "ticket", ticket: t })),
  ];

  const selected = value
    .map((id) => allTickets.find((t) => t.id === id))
    .filter((t): t is Ticket => !!t);

  function add(id: string) {
    onChange([...value, id]);
    setQuery("");
    setOpen(false);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-col gap-1">
          {selected.map((t) => (
            <span
              key={t.id}
              className="flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs w-full"
            >
              <Link
                href={`/projects/${projectKey}/tickets/${t.key}`}
                className="font-mono text-indigo-600 hover:underline shrink-0 whitespace-nowrap"
              >
                {t.key}
              </Link>
              <span className="text-zinc-600 truncate flex-1 min-w-0">{t.title}</span>
              <span className="rounded px-1 py-0 text-[10px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200 shrink-0 whitespace-nowrap">{t.status}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-zinc-400 hover:text-red-500 leading-none ml-0.5 shrink-0"
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Search by key or title…"
          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
        {open && candidates.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-zinc-200 bg-white shadow-lg">
            {candidates.slice(0, 25).map((item, i) =>
              item.type === "label" ? (
                <li key={`label-${i}`} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50 border-t border-zinc-100">
                  {item.label}
                </li>
              ) : (
                <li key={item.ticket.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); add(item.ticket.id); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                  >
                    <span className="font-mono text-indigo-600 shrink-0">{item.ticket.key}</span>
                    <span className="truncate text-zinc-700">{item.ticket.title}</span>
                  </button>
                </li>
              )
            )}
          </ul>
        )}
        {open && query && candidates.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg">
            No matching tickets
          </div>
        )}
      </div>
    </div>
  );
}
