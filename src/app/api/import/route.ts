import { NextRequest } from "next/server";
import { checkAuth, ok, bad } from "@/lib/api-auth";
import { getProjectByKey, createProject } from "@/lib/actions/projects";
import { createTicket, createEpic } from "@/lib/actions/tickets";
import { z } from "zod";

const EpicSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  _localId: z.string().optional(),
});

const TicketSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  type: z.enum(["story", "bug", "task", "epic"]).optional(),
  priority: z.enum(["lowest", "low", "med", "high", "highest"]).optional(),
  status: z.string().optional(),
  epicLocalId: z.string().optional(), // refers to _localId in epics array
  storyPoints: z.number().int().nullable().optional(),
  labels: z.array(z.string()).optional(),
  sprint: z.string().nullable().optional(),
  fixVersion: z.string().nullable().optional(),
  milestone: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
});

const ImportSchema = z.object({
  project: z.object({
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    statuses: z.array(z.string()).optional(),
  }),
  epics: z.array(EpicSchema).optional(),
  tickets: z.array(TicketSchema).optional(),
});

// POST /api/import
// {
//   "project": {"key": "ABT", "name": "AI Bot Trading"},
//   "epics": [{"title": "Auth", "_localId": "e1"}],
//   "tickets": [{"title": "Login UI", "type": "story", "epicLocalId": "e1"}]
// }
export async function POST(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  try {
    const body = await req.json();
    const data = ImportSchema.parse(body);

    let project = await getProjectByKey(data.project.key);
    if (!project) {
      const c = await createProject({
        key: data.project.key,
        name: data.project.name,
        description: data.project.description,
      });
      project = await getProjectByKey(c.key);
    }
    if (!project) return bad("failed to create/find project", 500);

    const epicIdMap: Record<string, string> = {};
    const createdEpics: { id: string; title: string }[] = [];
    for (const e of data.epics ?? []) {
      const r = await createEpic({
        projectId: project.id,
        title: e.title,
        description: e.description ?? undefined,
      });
      if (e._localId) epicIdMap[e._localId] = r.id;
      createdEpics.push({ id: r.id, title: e.title });
    }

    const createdTickets: { key: string; id: string }[] = [];
    for (const t of data.tickets ?? []) {
      const r = await createTicket({
        projectId: project.id,
        title: t.title,
        description: t.description ?? undefined,
        type: t.type ?? "task",
        priority: t.priority ?? "med",
        status: t.status,
        epicId: t.epicLocalId ? epicIdMap[t.epicLocalId] : undefined,
        storyPoints: t.storyPoints ?? undefined,
        labels: t.labels,
        sprint: t.sprint ?? undefined,
        fixVersion: t.fixVersion ?? undefined,
        milestone: t.milestone ?? undefined,
        phase: t.phase ?? undefined,
      });
      createdTickets.push(r);
    }

    return ok(
      {
        project: { id: project.id, key: project.key },
        epics: createdEpics,
        tickets: createdTickets,
      },
      201
    );
  } catch (e: any) {
    return bad(e.message ?? "invalid input", 400);
  }
}
