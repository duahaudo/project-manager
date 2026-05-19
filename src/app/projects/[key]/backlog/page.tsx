import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject } from "@/lib/actions/tickets";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();
  const tickets = await listTicketsByProject(project.id);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b text-left text-zinc-500">
          <tr>
            <th className="py-2">Key</th>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Phase</th>
            <th>Milestone</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <td className="py-2 font-mono">
                <Link href={`/projects/${key}/tickets/${t.key}`} className="text-indigo-600">
                  {t.key}
                </Link>
              </td>
              <td>{t.title}</td>
              <td>{t.type}</td>
              <td>{t.status}</td>
              <td>{t.priority}</td>
              <td>{t.phase ?? "—"}</td>
              <td>{t.milestone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
