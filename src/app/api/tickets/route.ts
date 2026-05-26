import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { checkAuth, ok, bad } from "@/lib/api-auth";
import { createTicket, listTicketsByProject } from "@/lib/actions/tickets";
import { getProjectByKey } from "@/lib/actions/projects";
import { z } from "zod";

// GET /api/tickets?projectKey=ABT
export async function GET(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) return bad("projectKey required");
  const project = await getProjectByKey(projectKey);
  if (!project) return bad("project not found", 404);
  return ok(await listTicketsByProject(project.id));
}

const InputSchema = z.object({
  projectKey: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["story", "bug", "task", "epic"]).optional(),
  priority: z.enum(["lowest", "low", "med", "high", "highest"]).optional(),
  status: z.string().optional(),
  parentId: z.string().optional(),
  storyPoints: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
  sprint: z.string().optional(),
  fixVersion: z.string().optional(),
  milestone: z.string().optional(),
  phase: z.string().optional(),
});

// POST /api/tickets  — accepts {projectKey} or {projectId}; body can be object or {tickets: [...]}
export async function POST(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  try {
    const body = await req.json();
    const items: any[] = Array.isArray(body) ? body : body.tickets ?? [body];
    const results = [];
    for (const raw of items) {
      const data = InputSchema.parse(raw);
      let projectId = data.projectId;
      if (!projectId && data.projectKey) {
        const p = await getProjectByKey(data.projectKey);
        if (!p) return bad(`project not found: ${data.projectKey}`, 404);
        projectId = p.id;
      }
      if (!projectId) return bad("projectKey or projectId required");
      const { projectKey, ...rest } = data;
      const result = await createTicket({
        ...rest,
        projectId,
        type: rest.type ?? "task",
        priority: rest.priority ?? "med",
      });
      results.push(result);
    }
    return ok(Array.isArray(body) || body.tickets ? { created: results } : results[0], 201);
  } catch (e: any) {
    return bad(e.message ?? "invalid input", 400);
  }
}
