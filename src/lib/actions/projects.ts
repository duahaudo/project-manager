"use server";
import { db, schema } from "@/lib/db/client";
import { eq, ne, sql, asc, desc } from "drizzle-orm";
import { midpoint, initialRank } from "@/lib/rank";
import { revalidatePath } from "next/cache";
import { uid } from "@/lib/utils";
import { z } from "zod";

const ProjectSchema = z.object({
  key: z.string().min(2).max(8).regex(/^[A-Z][A-Z0-9]+$/, "Uppercase letters/digits, start with letter"),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function createProject(input: z.infer<typeof ProjectSchema>) {
  const data = ProjectSchema.parse(input);
  const id = uid();
  const existing = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
  // Always-one-default invariant: first project always becomes default.
  // If caller asked for default, also clear other defaults.
  const becomesDefault = existing.length === 0 || !!data.isDefault;
  if (data.isDefault && existing.length > 0) {
    await db.update(schema.projects).set({ isDefault: false });
  }
  // Get last project rank
  const lastProj = await db.select({ rank: schema.projects.rank }).from(schema.projects).orderBy(desc(schema.projects.rank)).limit(1);
  const rank = lastProj[0] ? midpoint(lastProj[0].rank, null) : initialRank();
  await db.insert(schema.projects).values({
    id,
    key: data.key,
    name: data.name,
    description: data.description ?? null,
    isDefault: becomesDefault,
    rank,
  });
  revalidatePath("/");
  return { id, key: data.key };
}

export async function setDefaultProject(id: string) {
  // Always-one-default: clear all then set target. Never allow zero defaults.
  await db.update(schema.projects).set({ isDefault: false });
  await db.update(schema.projects).set({ isDefault: true }).where(eq(schema.projects.id, id));
  revalidatePath("/");
}

export async function getDefaultProject() {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.isDefault, true))
    .limit(1);
  if (rows[0]) return rows[0];
  // Fallback: if nothing flagged (shouldn't happen after migration), pick oldest.
  const fallback = await db
    .select()
    .from(schema.projects)
    .orderBy(asc(schema.projects.createdAt))
    .limit(1);
  return fallback[0] ?? null;
}

export async function listProjects() {
  return db.select().from(schema.projects).orderBy(asc(schema.projects.rank), asc(schema.projects.createdAt));
}

export async function reorderProject(input: {
  id: string;
  beforeId: string | null;
  afterId: string | null;
}) {
  const [beforeRows, afterRows] = await Promise.all([
    input.beforeId
      ? db.select({ rank: schema.projects.rank }).from(schema.projects).where(eq(schema.projects.id, input.beforeId)).limit(1)
      : Promise.resolve([]),
    input.afterId
      ? db.select({ rank: schema.projects.rank }).from(schema.projects).where(eq(schema.projects.id, input.afterId)).limit(1)
      : Promise.resolve([]),
  ]);
  const rank = midpoint(beforeRows[0]?.rank ?? null, afterRows[0]?.rank ?? null);
  await db.update(schema.projects).set({ rank }).where(eq(schema.projects.id, input.id));
  revalidatePath("/");
}

export async function getProjectByKey(key: string) {
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.key, key)).limit(1);
  return rows[0] ?? null;
}

export async function deleteProject(id: string) {
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  revalidatePath("/");
}
