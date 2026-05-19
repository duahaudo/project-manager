import { NextResponse } from "next/server";

export function checkAuth(req: Request): NextResponse | null {
  const expected = process.env.PM_API_KEY;
  if (!expected) return null; // no key configured = open (local dev)
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.headers.get("x-api-key") || "";
  if (token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
