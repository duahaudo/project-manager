"use client";
import { useState } from "react";
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

  if (currentTicket?.type === "epic") return null;

  const allowed = ALLOWED_PARENT_TYPES[currentTicket?.type ?? "task"] ?? [];
  const candidates = allTickets.filter(
    (t) => t.id !== currentTicket?.id && allowed.includes(t.type)
  );

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    onParentChange(e.target.value || null);
    setShowDropdown(false);
  }

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
          <div className="absolute top-full left-0 z-20 mt-1 w-72 rounded border border-zinc-200 bg-white shadow-lg">
            <select
              size={Math.min(candidates.length + 1, 8)}
              value={parentTicket?.id ?? ""}
              onChange={handleSelect}
              className="w-full rounded px-2 py-1 text-sm text-zinc-900 outline-none"
              autoFocus
              onBlur={() => setShowDropdown(false)}
            >
              <option value="">— no parent —</option>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.type}] {t.key} – {t.title}
                </option>
              ))}
            </select>
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
