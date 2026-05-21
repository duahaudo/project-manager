"use server";
import { db, schema } from "@/lib/db/client";
import { and, asc, desc, eq, gt, lt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { uid } from "@/lib/utils";
import { midpoint, initialRank } from "@/lib/rank";
import { z } from "zod";

const TicketCreateSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["story", "bug", "task", "epic"]).default("task"),
  priority: z.enum(["lowest", "low", "med", "high", "highest"]).default("med"),
  status: z.string().optional(),
  epicId: z.string().optional(),
  storyPoints: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
  sprint: z.string().optional(),
  fixVersion: z.string().optional(),
  milestone: z.string().optional(),
  phase: z.string().optional(),
  parentId: z.string().nullable().optional(),
  relatedIds: z.array(z.string()).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  estimation: z.number().nullable().optional(),
});

export async function createTicket(input: z.infer<typeof TicketCreateSchema>) {
  const data = TicketCreateSchema.parse(input);
  const project = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, data.projectId))
    .limit(1);
  if (!project[0]) throw new Error("Project not found");
  const proj = project[0];
  const nextNum = proj.ticketCounter + 1;
  const key = `${proj.key}-${nextNum}`;
  const status = data.status ?? (proj.statuses[0] ?? "Backlog");

  // bottom rank in target column
  const last = await db
    .select()
    .from(schema.tickets)
    .where(and(eq(schema.tickets.projectId, data.projectId), eq(schema.tickets.status, status)))
    .orderBy(desc(schema.tickets.rank))
    .limit(1);
  const rank = last[0] ? midpoint(last[0].rank, null) : initialRank();

  const id = uid();
  await db.insert(schema.tickets).values({
    id,
    key,
    projectId: data.projectId,
    epicId: data.epicId ?? null,
    title: data.title,
    description: data.description ?? null,
    type: data.type,
    priority: data.priority,
    status,
    storyPoints: data.storyPoints ?? null,
    labels: data.labels ?? [],
    sprint: data.sprint ?? null,
    fixVersion: data.fixVersion ?? null,
    milestone: data.milestone ?? null,
    phase: data.phase ?? null,
    parentId: data.parentId ?? null,
    relatedIds: data.relatedIds ?? [],
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    estimation: data.estimation ?? null,
    rank,
  });
  await db
    .update(schema.projects)
    .set({ ticketCounter: nextNum })
    .where(eq(schema.projects.id, data.projectId));

  revalidatePath(`/projects/${proj.key}/board`);
  revalidatePath(`/projects/${proj.key}/backlog`);
  return { id, key };
}

const TicketUpdateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z.enum(["story", "bug", "task", "epic"]).optional(),
  priority: z.enum(["lowest", "low", "med", "high", "highest"]).optional(),
  status: z.string().optional(),
  epicId: z.string().nullable().optional(),
  storyPoints: z.number().int().nullable().optional(),
  labels: z.array(z.string()).optional(),
  sprint: z.string().nullable().optional(),
  fixVersion: z.string().nullable().optional(),
  milestone: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  components: z.array(z.string()).optional(),
  parentId: z.string().nullable().optional(),
  relatedIds: z.array(z.string()).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  estimation: z.number().nullable().optional(),
});

export async function updateTicket(input: z.infer<typeof TicketUpdateSchema>) {
  const data = TicketUpdateSchema.parse(input);
  const { id, startDate, endDate, ...rest } = data;
  await db
    .update(schema.tickets)
    .set({
      ...rest,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.tickets.id, id));
  const t = await db
    .select({ key: schema.tickets.key, type: schema.tickets.type })
    .from(schema.tickets)
    .where(eq(schema.tickets.id, id))
    .limit(1);
  if (t[0]) {
    const projectKey = t[0].key.split("-").slice(0, -1).join("-");
    revalidatePath(`/projects/${projectKey}/board`);
    revalidatePath(`/projects/${projectKey}/tickets/${t[0].key}`);
    if (t[0].type === "epic") {
      revalidatePath(`/projects/${projectKey}/epics/${t[0].key}`);
    }
  }
}

export async function moveTicket(input: {
  id: string;
  status: string;
  beforeId?: string | null;
  afterId?: string | null;
}) {
  const [beforeRows, afterRows] = await Promise.all([
    input.beforeId
      ? db.select({ rank: schema.tickets.rank }).from(schema.tickets).where(eq(schema.tickets.id, input.beforeId)).limit(1)
      : Promise.resolve([]),
    input.afterId
      ? db.select({ rank: schema.tickets.rank }).from(schema.tickets).where(eq(schema.tickets.id, input.afterId)).limit(1)
      : Promise.resolve([]),
  ]);
  const rank = midpoint(beforeRows[0]?.rank ?? null, afterRows[0]?.rank ?? null);

  await db
    .update(schema.tickets)
    .set({ status: input.status, rank, updatedAt: new Date() })
    .where(eq(schema.tickets.id, input.id));

  const t = await db
    .select({ key: schema.tickets.key })
    .from(schema.tickets)
    .where(eq(schema.tickets.id, input.id))
    .limit(1);
  if (t[0]) {
    const projectKey = t[0].key.split("-").slice(0, -1).join("-");
    revalidatePath(`/projects/${projectKey}/board`);
    revalidatePath(`/projects/${projectKey}/backlog`);
  }
}

export async function deleteTicket(id: string) {
  const t = await db
    .select({ key: schema.tickets.key })
    .from(schema.tickets)
    .where(eq(schema.tickets.id, id))
    .limit(1);
  await db.delete(schema.tickets).where(eq(schema.tickets.id, id));
  if (t[0]) {
    const projectKey = t[0].key.split("-").slice(0, -1).join("-");
    revalidatePath(`/projects/${projectKey}/board`);
  }
}

export async function listAllTicketsByProject(projectId: string) {
  return db
    .select()
    .from(schema.tickets)
    .where(eq(schema.tickets.projectId, projectId))
    .orderBy(asc(schema.tickets.rank));
}

export async function getChildTickets(parentId: string, parentType?: string) {
  if (parentType === "epic") {
    return db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.epicId, parentId))
      .orderBy(asc(schema.tickets.rank));
  }
  return db
    .select()
    .from(schema.tickets)
    .where(eq(schema.tickets.parentId, parentId))
    .orderBy(asc(schema.tickets.rank));
}

export async function getParentTicket(parentId: string | null | undefined, epicId?: string | null) {
  const id = parentId ?? epicId;
  if (!id) return null;
  const rows = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listTicketsByProject(projectId: string) {
  return db
    .select()
    .from(schema.tickets)
    .where(and(eq(schema.tickets.projectId, projectId), ne(schema.tickets.type, "epic")))
    .orderBy(asc(schema.tickets.rank));
}

export async function getTicketByKey(key: string) {
  const rows = await db.select().from(schema.tickets).where(eq(schema.tickets.key, key)).limit(1);
  return rows[0] ?? null;
}

export async function listFieldValues(
  projectId: string
): Promise<{ phase: string[]; milestone: string[]; sprint: string[]; fixVersion: string[] }> {
  const rows = await db
    .select({
      phase: schema.tickets.phase,
      milestone: schema.tickets.milestone,
      sprint: schema.tickets.sprint,
      fixVersion: schema.tickets.fixVersion,
    })
    .from(schema.tickets)
    .where(eq(schema.tickets.projectId, projectId));
  const uniq = (vals: (string | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort();
  return {
    phase: uniq(rows.map((r) => r.phase)),
    milestone: uniq(rows.map((r) => r.milestone)),
    sprint: uniq(rows.map((r) => r.sprint)),
    fixVersion: uniq(rows.map((r) => r.fixVersion)),
  };
}

export async function listEpicTicketsByProject(projectId: string) {
  return db
    .select()
    .from(schema.tickets)
    .where(and(eq(schema.tickets.projectId, projectId), eq(schema.tickets.type, "epic")))
    .orderBy(asc(schema.tickets.createdAt));
}

export async function createEpicTicket(input: {
  projectId: string;
  title: string;
  description?: string;
  brdRef?: string;
  techSpecRef?: string;
}) {
  const project = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, input.projectId))
    .limit(1);
  if (!project[0]) throw new Error("Project not found");
  const proj = project[0];
  const nextNum = proj.ticketCounter + 1;
  const key = `${proj.key}-${nextNum}`;

  const id = uid();
  await db.insert(schema.tickets).values({
    id,
    key,
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? null,
    type: "epic",
    status: "To Do",
    priority: "med",
    rank: initialRank(),
    brdRef: input.brdRef ?? null,
    techSpecRef: input.techSpecRef ?? null,
  });
  await db
    .update(schema.projects)
    .set({ ticketCounter: nextNum })
    .where(eq(schema.projects.id, input.projectId));

  return { id, key };
}
