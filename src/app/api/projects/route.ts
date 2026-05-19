import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db/client";
import { checkAuth, ok, bad } from "@/lib/api-auth";
import { createProject, listProjects } from "@/lib/actions/projects";

export async function GET(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  return ok(await listProjects());
}

export async function POST(req: NextRequest) {
  const fail = checkAuth(req);
  if (fail) return fail;
  try {
    const body = await req.json();
    const result = await createProject(body);
    return ok(result, 201);
  } catch (e: any) {
    return bad(e.message ?? "invalid input", 400);
  }
}
