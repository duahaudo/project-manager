"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/db/schema";
import { setDefaultProject } from "@/lib/actions/projects";
import { NewProjectModal } from "./NewProjectModal";

export function ProjectsList({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggleDefault(p: Project) {
    if (p.isDefault) return; // can't unset the only default
    start(async () => {
      await setDefaultProject(p.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + New Project
        </button>
      </header>

      {projects.length === 0 ? (
        <p className="text-zinc-500">No projects yet. Create one above.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="relative rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
            >
              <button
                onClick={() => toggleDefault(p)}
                disabled={pending || p.isDefault}
                title={p.isDefault ? "Default project" : "Make default"}
                className={`absolute right-3 top-3 rounded p-1 text-lg leading-none ${
                  p.isDefault
                    ? "text-amber-500 cursor-default"
                    : "text-zinc-300 hover:text-amber-400"
                }`}
                aria-label={p.isDefault ? "Default" : "Make default"}
              >
                {p.isDefault ? "★" : "☆"}
              </button>
              <Link href={`/projects/${p.key}/board`} className="block pr-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-indigo-600">{p.key}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="mt-1 font-semibold text-zinc-900">{p.name}</h3>
                {p.description && (
                  <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && <NewProjectModal hasProjects={projects.length > 0} onClose={() => setOpen(false)} />}
    </div>
  );
}
