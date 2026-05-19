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

  return <ImportExportPanel projectKey={project.key} />;
}
