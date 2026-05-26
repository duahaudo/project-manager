import { NextRequest, NextResponse } from "next/server";
import { fetchJiraProjectStatuses } from "@/lib/jira/client";
import { JiraApiError } from "@/lib/jira/types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { baseUrl, email, apiToken, projectKey } = body as Record<string, unknown>;

  if (
    typeof baseUrl !== "string" || !baseUrl.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof apiToken !== "string" || !apiToken.trim() ||
    typeof projectKey !== "string" || !projectKey.trim()
  ) {
    return NextResponse.json(
      { error: "baseUrl, email, apiToken, and projectKey are required" },
      { status: 400 }
    );
  }

  try {
    const creds = { baseUrl: baseUrl.trim(), email: email.trim(), apiToken: apiToken.trim() };
    const statuses = await fetchJiraProjectStatuses(creds, projectKey.trim().toUpperCase());
    return NextResponse.json({ statuses });
  } catch (err) {
    if (err instanceof JiraApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
