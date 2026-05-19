import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();
  // Cookie "last-project-key" written by middleware.ts

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 sm:px-6 sm:py-3">
          <Link href="/?all=1" className="text-xs text-zinc-500 hover:underline whitespace-nowrap">
            ← Projects
          </Link>
          <h1 className="text-base font-bold text-zinc-900 sm:text-lg truncate">
            <span className="font-mono text-indigo-600">{project.key}</span>{" "}
            <span className="text-zinc-400">·</span> {project.name}
          </h1>
          <nav className="ml-auto flex gap-3 text-sm">
            <Link href={`/projects/${project.key}/board`} className="hover:underline">
              Board
            </Link>
            <Link href={`/projects/${project.key}/backlog`} className="hover:underline">
              Backlog
            </Link>
            <Link href={`/projects/${project.key}/import`} className="hover:underline">
              Import
            </Link>
            <Link href={`/api-docs`} className="hover:underline text-zinc-500">
              API
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
