"use client";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { createTicket, updateTicket, deleteTicket } from "@/lib/actions/tickets";
import type { Ticket } from "@/lib/db/schema";
import { MarkdownEditor } from "./MarkdownEditor";
import { Combobox } from "@/components/ui/Combobox";
import { RelatedTicketsPicker } from "./RelatedTicketsPicker";
import { ParentSection } from "./ParentSection";
import { ChildrenSection } from "./ChildrenSection";

type FieldValues = { phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] };

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

type Draft = Pick<
  Ticket,
  | "title" | "description" | "type" | "priority" | "status"
  | "phase" | "milestone" | "sprint" | "fixVersion" | "storyPoints"
> & {
  relatedIds: string[];
  startDate: string;
  endDate: string;
  estimation: number | null;
  parentId: string | null;
};

export function TicketForm({
  mode,
  ticket,
  projectId,
  projectKey,
  statuses,
  fieldValues,
  allTickets,
  parentTicket,
  childTickets,
  defaultParentId,
  disableTypeChange,
  allTicketsForParent,
  hideChildren,
  onClose,
  onChanged,
  onSaved,
}: {
  mode: "create" | "edit";
  ticket: Ticket | null;
  projectId: string;
  projectKey: string;
  statuses: string[];
  fieldValues: FieldValues;
  allTickets?: Ticket[];
  parentTicket?: Ticket | null;
  childTickets?: Ticket[];
  defaultParentId?: string | null;
  disableTypeChange?: boolean;
  allTicketsForParent?: Ticket[];
  hideChildren?: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onSaved?: () => void;
}) {
  const initial: Draft = ticket
    ? {
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        phase: ticket.phase,
        milestone: ticket.milestone,
        sprint: ticket.sprint,
        fixVersion: ticket.fixVersion,
        storyPoints: ticket.storyPoints,
        relatedIds: ticket.relatedIds ?? [],
        startDate: toDateInput(ticket.startDate),
        endDate: toDateInput(ticket.endDate),
        estimation: ticket.estimation ?? null,
        parentId: ticket.parentId ?? null,
      }
    : {
        title: "",
        description: "",
        type: "task",
        priority: "med",
        status: statuses[0],
        phase: null,
        milestone: null,
        sprint: null,
        fixVersion: null,
        storyPoints: null,
        relatedIds: [],
        startDate: "",
        endDate: "",
        estimation: null,
        parentId: defaultParentId ?? null,
      };

  const [t, setT] = useState<Draft>(initial);
  const [currentParent, setCurrentParent] = useState<Ticket | null>(() => {
    if (parentTicket) return parentTicket;
    const lookupId = initial.parentId ?? null;
    if (lookupId && allTicketsForParent) {
      return allTicketsForParent.find((tk) => tk.id === lookupId) ?? null;
    }
    return null;
  });
  const [descMode, setDescMode] = useState<"edit" | "preview">(mode === "create" ? "edit" : "preview");
  const [activeTab, setActiveTab] = useState<"details" | "relations">("details");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleParentChange(parentId: string | null) {
    set("parentId", parentId);
    const found = parentId ? (allTicketsForParent ?? []).find((tk) => tk.id === parentId) ?? null : null;
    setCurrentParent(found);
  }

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setT((cur) => ({ ...cur, [k]: v }));
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    const blob = item.getAsFile();
    if (!blob) return;
    const pos = e.currentTarget.selectionStart;
    const currentDesc = t.description ?? "";
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const md = `\n![pasted image](${dataUrl})\n`;
      const next = currentDesc.slice(0, pos) + md + currentDesc.slice(pos);
      set("description", next);
    };
    reader.readAsDataURL(blob);
  }

  function save() {
    if (!t.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    start(async () => {
      try {
        if (mode === "create") {
          await createTicket({
            projectId,
            title: t.title,
            description: t.description ?? undefined,
            type: t.type as "story" | "bug" | "task" | "epic",
            priority: t.priority as "lowest" | "low" | "med" | "high" | "highest",
            status: t.status,
            phase: t.phase ?? undefined,
            milestone: t.milestone ?? undefined,
            sprint: t.sprint ?? undefined,
            fixVersion: t.fixVersion ?? undefined,
            storyPoints: t.storyPoints ?? undefined,
            relatedIds: t.relatedIds,
            startDate: t.startDate || null,
            endDate: t.endDate || null,
            estimation: t.estimation,
            parentId: t.parentId ?? undefined,
          });
        } else if (ticket) {
          await updateTicket({
            id: ticket.id,
            title: t.title,
            description: t.description,
            type: t.type as "story" | "bug" | "task" | "epic",
            priority: t.priority as "lowest" | "low" | "med" | "high" | "highest",
            status: t.status,
            phase: t.phase,
            milestone: t.milestone,
            sprint: t.sprint,
            fixVersion: t.fixVersion,
            storyPoints: t.storyPoints,
            relatedIds: t.relatedIds,
            startDate: t.startDate || null,
            endDate: t.endDate || null,
            estimation: t.estimation,
            parentId: t.parentId,
          });
        }
        if (onSaved) {
          onSaved();
        } else {
          onChanged?.();
          onClose();
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to save");
      }
    });
  }

  async function onDelete() {
    if (!ticket) return;
    if (!confirm(`Delete ${ticket.key}? This cannot be undone.`)) return;
    await deleteTicket(ticket.id);
    onChanged?.();
    onClose();
  }

  const isEdit = mode === "edit";

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px] md:items-stretch">
        {/* Main */}
        <div className="flex min-w-0 flex-col gap-4 min-h-0">
          <input
            autoFocus={!isEdit}
            value={t.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Title"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400"
          />

          {/* Tabs */}
          <div className="flex border-b border-zinc-200 gap-0">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "details" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
            >
              Details
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => setActiveTab("relations")}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "relations" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
              >
                Relations
              </button>
            )}
          </div>

          {/* Details tab */}
          {activeTab === "details" && (
            <>
              {allTicketsForParent && allTicketsForParent.length > 0 && (!ticket || ticket.type !== "epic") && (
                <ParentSection
                  currentTicket={ticket}
                  parentTicket={currentParent}
                  allTickets={allTicketsForParent}
                  projectKey={projectKey}
                  projectId={projectId}
                  statuses={statuses}
                  fieldValues={fieldValues}
                  onParentChange={handleParentChange}
                />
              )}
              <div className="flex flex-1 flex-col min-h-0">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm text-zinc-500">Description</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDescMode("edit")}
                      className={`rounded px-2 py-0.5 ${descMode === "edit" ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-700"}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescMode("preview")}
                      className={`rounded px-2 py-0.5 ${descMode === "preview" ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-700"}`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {descMode === "edit" ? (
                  <MarkdownEditor
                    value={t.description ?? ""}
                    onChange={(v) => set("description", v)}
                    onPaste={onPaste}
                    rows={12}
                    placeholder="Markdown supported. Paste image to embed. Use toolbar above."
                    className="flex-1 min-h-[200px] overflow-y-auto"
                  />
                ) : (
                  <div
                    onClick={() => setDescMode("edit")}
                    className="flex-1 min-h-[200px] overflow-y-auto cursor-text rounded border border-zinc-200 bg-white px-3 py-3 text-sm leading-relaxed text-zinc-800 [&_a]:text-indigo-600 [&_a]:underline [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-2 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
                  >
                    {t.description ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        urlTransform={(url) => url}
                        components={{
                          a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline" />,
                          img: ({ src, alt }) => src ? <img src={src} alt={alt ?? ""} className="max-w-full rounded" /> : null,
                        }}
                      >
                        {t.description}
                      </ReactMarkdown>
                    ) : (
                      <span className="italic text-zinc-500">No description. Click to add.</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Relations tab */}
          {activeTab === "relations" && isEdit && ticket && (
            <div className="flex flex-col gap-6">
              {allTicketsForParent && allTicketsForParent.length > 0 && ticket.type !== "epic" && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Parent</h3>
                  <ParentSection
                    currentTicket={ticket}
                    parentTicket={currentParent}
                    allTickets={allTicketsForParent}
                    projectKey={projectKey}
                    projectId={projectId}
                    statuses={statuses}
                    fieldValues={fieldValues}
                    onParentChange={handleParentChange}
                  />
                </div>
              )}
              {!hideChildren && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Children</h3>
                  <ChildrenSection
                    currentTicket={ticket}
                    childTickets={childTickets ?? []}
                    projectKey={projectKey}
                    projectId={projectId}
                    statuses={statuses}
                    fieldValues={fieldValues}
                    allTicketsForParent={allTicketsForParent}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <Field label="Status">
            <select
              value={t.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={t.type}
              onChange={(e) => set("type", e.target.value as any)}
              disabled={disableTypeChange === true}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 disabled:opacity-60"
            >
              {["task", "story", "bug", "epic"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={t.priority}
              onChange={(e) => set("priority", e.target.value as any)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            >
              {["lowest", "low", "med", "high", "highest"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Phase">
            <Combobox
              value={t.phase ?? ""}
              options={fieldValues.phase}
              onChange={(v) => set("phase", v || null)}
              placeholder="e.g. P1"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="Milestone">
            <Combobox
              value={t.milestone ?? ""}
              options={fieldValues.milestone}
              onChange={(v) => set("milestone", v || null)}
              placeholder="e.g. M1"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="Sprint">
            <Combobox
              value={t.sprint ?? ""}
              options={fieldValues.sprint}
              onChange={(v) => set("sprint", v || null)}
              placeholder="e.g. Sprint 1"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="Fix Version">
            <Combobox
              value={t.fixVersion ?? ""}
              options={fieldValues.fixVersion}
              onChange={(v) => set("fixVersion", v || null)}
              placeholder="e.g. v1.0"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          {allTickets && allTickets.length > 0 && (
            <Field label="Relates To">
              <RelatedTicketsPicker
                value={t.relatedIds}
                onChange={(ids) => set("relatedIds", ids)}
                allTickets={allTickets}
                currentTicketId={ticket?.id}
                projectKey={projectKey}
              />
            </Field>
          )}
          <Field label="Story Points">
            <input
              type="number"
              value={t.storyPoints ?? ""}
              onChange={(e) => set("storyPoints", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="Start Date">
            <input
              type="date"
              value={t.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="End Date">
            <input
              type="date"
              value={t.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          <Field label="Estimation (hours)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={t.estimation ?? ""}
              onChange={(e) => set("estimation", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            />
          </Field>
          {isEdit && ticket && (
            <div className="pt-2 text-xs text-zinc-500">
              <div>Created {new Date(ticket.createdAt).toLocaleString()}</div>
              <div>Updated {new Date(ticket.updatedAt).toLocaleString()}</div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer: actions */}
      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4">
        <div>
          {isEdit && (
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
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
            disabled={pending || !t.title.trim()}
            onClick={save}
            className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
