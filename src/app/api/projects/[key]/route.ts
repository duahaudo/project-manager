import { NextRequest } from "next/server";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject, listEpicTicketsByProject } from "@/lib/actions/tickets";
import { checkAuth, ok, bad } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) return bad("not found", 404);
  const tickets = await listTicketsByProject(project.id);
  const epics = await listEpicTicketsByProject(project.id);
  return ok({ project, epics, tickets });
}
