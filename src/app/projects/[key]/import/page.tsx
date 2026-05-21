import { notFound } from "next/navigation";
import { getProjectByKey } from "@/lib/actions/projects";
import { ImportExportPanel } from "@/components/import/ImportExportPanel";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      <ImportExportPanel projectKey={project.key} />
    </div>
  );
}
