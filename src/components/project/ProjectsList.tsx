"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Project } from "@/lib/db/schema";
import { setDefaultProject, reorderProject } from "@/lib/actions/projects";
import { NewProjectModal } from "./NewProjectModal";
import { RefreshButton } from "@/components/ui/RefreshButton";

function SortableProjectCard({
  p,
  onToggleDefault,
  pending,
}: {
  p: Project;
  onToggleDefault: (p: Project) => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: p.id });

  return (
    <li
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="relative rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
    >
      <div
        className="absolute left-3 top-3 cursor-grab text-zinc-300 hover:text-zinc-500 select-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </div>
      <button
        onClick={() => onToggleDefault(p)}
        disabled={pending || p.isDefault}
        title={p.isDefault ? "Default project" : "Make default"}
        className={`absolute right-3 top-3 rounded p-1 text-lg leading-none ${
          p.isDefault ? "text-amber-500 cursor-default" : "text-zinc-300 hover:text-amber-400"
        }`}
        aria-label={p.isDefault ? "Default" : "Make default"}
      >
        {p.isDefault ? "★" : "☆"}
      </button>
      <Link href={`/projects/${p.key}/board`} className="block px-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-indigo-600">{p.key}</span>
          <span className="text-xs text-zinc-500">{new Date(p.createdAt).toLocaleDateString()}</span>
        </div>
        <h3 className="mt-1 font-semibold text-zinc-900">{p.name}</h3>
        {p.description && <p className="mt-1 text-sm text-zinc-600">{p.description}</p>}
      </Link>
    </li>
  );
}

export function ProjectsList({ projects: initial }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeProject = activeId ? projects.find((p) => p.id === activeId) ?? null : null;

  function toggleDefault(p: Project) {
    if (p.isDefault) return;
    start(async () => {
      await setDefaultProject(p.id);
      router.refresh();
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const fromIdx = projects.findIndex((p) => p.id === active.id);
    const toIdx = projects.findIndex((p) => p.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;

    const newProjects = arrayMove(projects, fromIdx, toIdx);
    setProjects(newProjects);

    const before = newProjects[toIdx - 1] ?? null;
    const after = newProjects[toIdx + 1] ?? null;
    const moved = newProjects[toIdx];

    start(async () => {
      await reorderProject({
        id: moved.id,
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      });
    });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <button
            onClick={() => setOpen(true)}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            + New Project
          </button>
        </div>
      </header>

      {projects.length === 0 ? (
        <p className="text-zinc-500">No projects yet. Create one above.</p>
      ) : (
        <DndContext id="projects-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={projects.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <SortableProjectCard key={p.id} p={p} onToggleDefault={toggleDefault} pending={pending} />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeProject ? (
              <div className="rounded-lg border border-indigo-300 bg-white p-4 shadow-lg opacity-90">
                <span className="font-mono text-sm text-indigo-600">{activeProject.key}</span>
                <h3 className="mt-1 font-semibold text-zinc-900">{activeProject.name}</h3>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {open && <NewProjectModal hasProjects={projects.length > 0} onClose={() => setOpen(false)} />}
    </div>
  );
}
