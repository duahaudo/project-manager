import { NextRequest } from "next/server";
import { getTicketByKey, updateTicket, deleteTicket } from "@/lib/actions/tickets";
import { checkAuth, ok, bad } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const { key } = await params;
  const ticket = await getTicketByKey(key);
  if (!ticket) return bad("not found", 404);
  return ok(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const { key } = await params;
  const existing = await getTicketByKey(key);
  if (!existing) return bad("not found", 404);
  try {
    const body = await req.json();
    await updateTicket({ id: existing.id, ...body });
    const updated = await getTicketByKey(key);
    return ok(updated);
  } catch (e: any) {
    return bad(e.message ?? "invalid input", 400);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const fail = checkAuth(req);
  if (fail) return fail;
  const { key } = await params;
  const existing = await getTicketByKey(key);
  if (!existing) return bad("not found", 404);
  await deleteTicket(existing.id);
  return ok({ deleted: true });
}
