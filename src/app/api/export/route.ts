import { NextRequest } from "next/server";
import { checkAuth, ok, bad } from "@/lib/api-auth";
import { getProjectByKey } from "@/lib/actions/projects";
import { listTicketsByProject, listEpicTicketsByProject } from "@/lib/actions/tickets";

// GET /api/export?projectKey=ABT
export async function GET(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) return bad("projectKey required");
  const project = await getProjectByKey(projectKey);
  if (!project) return bad("project not found", 404);
  const tickets = await listTicketsByProject(project.id);
  const epics = await listEpicTicketsByProject(project.id);
  return new Response(
    JSON.stringify({ project, epics, tickets, exportedAt: new Date().toISOString() }, null, 2),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${projectKey}-export.json"`,
      },
    }
  );
}
