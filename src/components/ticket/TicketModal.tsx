"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TicketForm } from "./TicketForm";
import type { Ticket } from "@/lib/db/schema";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

export function TicketModal({
  mode,
  ticket,
  projectId,
  projectKey,
  statuses,
  fieldValues,
  onClose,
}: {
  mode: "create" | "edit";
  ticket: Ticket | null;
  projectId: string;
  projectKey: string;
  statuses: string[];
  fieldValues: FieldValues;
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-lg border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-zinc-200 bg-white px-6 py-3">
          <h2 className="text-base font-semibold text-zinc-900">
            {mode === "create" ? "New Ticket" : `Edit ${ticket?.key}`}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <TicketForm
            mode={mode}
            ticket={ticket}
            projectId={projectId}
            projectKey={projectKey}
            statuses={statuses}
            fieldValues={fieldValues}
            onClose={onClose}
            onChanged={() => router.refresh()}
          />
        </div>
      </div>
    </div>
  );
}
