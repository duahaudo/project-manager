"use client";
import { useState, useRef, useEffect } from "react";
import { TicketModal } from "./TicketModal";
import type { Ticket } from "@/lib/db/schema";

const ALLOWED_PARENT_TYPES: Record<string, string[]> = {
  task: ["story", "epic"],
  story: ["epic"],
  bug: ["story", "epic"],
};

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

export function ParentSection({
  currentTicket,
  parentTicket,
  allTickets,
  projectKey,
  projectId,
  statuses,
  fieldValues,
  onParentChange,
}: {
  currentTicket: Ticket | null;
  parentTicket: Ticket | null;
  allTickets: Ticket[];
  projectKey: string;
  projectId?: string;
  statuses?: string[];
  fieldValues?: FieldValues;
  onParentChange: (parentId: string | null) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDropdown) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [showDropdown]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  if (currentTicket?.type === "epic") return null;

  const allowed = ALLOWED_PARENT_TYPES[currentTicket?.type ?? "task"] ?? [];
  const candidates = allTickets.filter(
    (t) => t.id !== currentTicket?.id && allowed.includes(t.type)
  );

  function handleSelect(id: string | null) {
    onParentChange(id);
    setShowDropdown(false);
  }

  const filtered = candidates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.key.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-500">Parent</label>
      <div className="relative mt-1 flex items-center gap-2">
        {parentTicket ? (
          <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs">
            {/* Clicking the key opens the ticket detail modal */}
            <button
              type="button"
              className="font-mono text-indigo-700 hover:underline"
              onClick={() => setShowTicketModal(true)}
            >
              {parentTicket.key}
            </button>
            {/* Clicking the title text opens the change-parent dropdown */}
            <button
              type="button"
              className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-zinc-600 hover:text-zinc-900"
              title={parentTicket.title}
              onClick={() => setShowDropdown((v) => !v)}
            >
              {parentTicket.title}
            </button>
            {/* Remove parent */}
            <button
              type="button"
              onClick={() => onParentChange(null)}
              className="ml-0.5 text-zinc-400 hover:text-red-500"
              title="Remove parent"
            >
              ×
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowDropdown((v) => !v)}
            className="text-xs text-zinc-400 italic hover:text-zinc-600"
          >
            None — click to set parent
          </button>
        )}

        {showDropdown && (
          <div ref={dropdownRef} className="absolute top-full left-0 z-20 mt-1 w-80 rounded border border-zinc-200 bg-white shadow-lg">
            <div className="p-1.5 border-b border-zinc-100">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              <button
                type="button"
                onMouseDown={() => handleSelect(null)}
                className="w-full px-3 py-1.5 text-left text-sm text-zinc-500 hover:bg-zinc-50"
              >
                — no parent —
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-400">No results</div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={() => handleSelect(t.id)}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 ${parentTicket?.id === t.id ? "bg-indigo-50 font-medium" : "text-zinc-700"}`}
                  >
                    <span className="text-zinc-400 text-xs">[{t.type}]</span>{" "}
                    <span className="font-mono text-indigo-700">{t.key}</span>{" "}
                    <span className="text-zinc-600">– {t.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showTicketModal && parentTicket && projectId && statuses && fieldValues && (
        <TicketModal
          mode="edit"
          ticket={parentTicket}
          projectId={projectId}
          projectKey={projectKey}
          statuses={statuses}
          fieldValues={fieldValues}
          allTickets={[]}
          allTicketsForParent={allTickets}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </div>
  );
}
