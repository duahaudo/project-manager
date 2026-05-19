"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions/projects";

export function NewProjectModal({
  hasProjects,
  onClose,
}: {
  hasProjects: boolean;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // First project must be default; user can't toggle off.
  const [isDefault, setIsDefault] = useState(!hasProjects);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function save() {
    setError(null);
    if (!key.trim() || !name.trim()) {
      setError("KEY and Name are required");
      return;
    }
    start(async () => {
      try {
        const res = await createProject({
          key: key.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
        });
        onClose();
        router.push(`/projects/${res.key}/board`);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to create");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-lg border-b border-zinc-200 bg-white px-6 py-3">
          <h2 className="text-base font-semibold text-zinc-900">New Project</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 p-6">
          <div>
            <label className="text-xs text-zinc-500">KEY</label>
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. ABT"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 uppercase text-zinc-900"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isDefault}
              disabled={!hasProjects}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Make this the default project
            {!hasProjects && (
              <span className="text-xs text-zinc-500">(first project is always default)</span>
            )}
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-3">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !key.trim() || !name.trim()}
            className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
