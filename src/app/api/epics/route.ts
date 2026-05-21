import { NextRequest } from "next/server";
import { checkAuth, ok, bad } from "@/lib/api-auth";
import { listEpicTicketsByProject, createEpicTicket } from "@/lib/actions/tickets";
import { getProjectByKey } from "@/lib/actions/projects";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) return bad("projectKey required");
  const p = await getProjectByKey(projectKey);
  if (!p) return bad("project not found", 404);
  return ok(await listEpicTicketsByProject(p.id));
}

const InputSchema = z.object({
  projectKey: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  brdRef: z.string().optional(),
  techSpecRef: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  try {
    const body = await req.json();
    const data = InputSchema.parse(body);
    let projectId = data.projectId;
    if (!projectId && data.projectKey) {
      const p = await getProjectByKey(data.projectKey);
      if (!p) return bad("project not found", 404);
      projectId = p.id;
    }
    if (!projectId) return bad("projectKey or projectId required");
    const result = await createEpicTicket({ projectId, title: data.title, description: data.description, brdRef: data.brdRef, techSpecRef: data.techSpecRef });
    return ok(result, 201);
  } catch (e: any) {
    return bad(e.message ?? "invalid input", 400);
  }
}
