import { redirect } from "next/navigation";
import { listProjects, getDefaultProject } from "@/lib/actions/projects";
import { ProjectsList } from "@/components/project/ProjectsList";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const sp = await searchParams;
  const projects = await listProjects();

  // First-open: jump to default project's board. Only show All Projects when:
  //   - ?all=1 explicitly (user clicked "← Projects"), OR
  //   - no projects exist yet.
  if (!sp.all && projects.length > 0) {
    const def = await getDefaultProject();
    if (def) redirect(`/projects/${def.key}/board`);
  }

  return <ProjectsList projects={projects} />;
}
