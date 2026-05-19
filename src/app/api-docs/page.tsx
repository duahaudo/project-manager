import Link from "next/link";

const SECTIONS: { title: string; method: string; path: string; body?: string; notes?: string }[] = [
  { title: "List projects", method: "GET", path: "/api/projects" },
  { title: "Create project", method: "POST", path: "/api/projects", body: `{"key":"ABT","name":"AI Bot Trading","description":"optional"}` },
  { title: "Get project (with epics+tickets)", method: "GET", path: "/api/projects/[key]" },
  { title: "List tickets", method: "GET", path: "/api/tickets?projectKey=ABT" },
  { title: "Create ticket(s)", method: "POST", path: "/api/tickets", body: `{"projectKey":"ABT","title":"Login UI","type":"story","priority":"high","status":"To Do","phase":"P1","milestone":"M1","sprint":"Sprint 1","epicId":"<id>","storyPoints":3,"labels":["auth"]}\n\n// bulk:\n{"tickets":[{...},{...}]}` },
  { title: "Get ticket", method: "GET", path: "/api/tickets/ABT-1" },
  { title: "Update ticket", method: "PATCH", path: "/api/tickets/ABT-1", body: `{"status":"In Progress","sprint":"Sprint 2","phase":"P2"}`, notes: "Partial update. All fields optional. Drag-and-drop in UI uses this same shape." },
  { title: "Delete ticket", method: "DELETE", path: "/api/tickets/ABT-1" },
  { title: "List epics", method: "GET", path: "/api/epics?projectKey=ABT" },
  { title: "Create epic", method: "POST", path: "/api/epics", body: `{"projectKey":"ABT","title":"Authentication","description":"optional"}` },
  { title: "Export project", method: "GET", path: "/api/export?projectKey=ABT", notes: "Returns JSON file download." },
  { title: "Import (BRD-derived tickets)", method: "POST", path: "/api/import", body: `{
  "project": {"key":"ABT","name":"AI Bot Trading"},
  "epics": [{"title":"Authentication","_localId":"e1"}],
  "tickets": [
    {"title":"Login UI","type":"story","priority":"high","epicLocalId":"e1"},
    {"title":"OAuth callback","type":"task","epicLocalId":"e1"}
  ]
}`, notes: "Use _localId / epicLocalId to link tickets to their epic in one call. Project is reused if key exists." },
];

const FIELDS = [
  ["title", "string (required)"],
  ["description", "string (markdown — links + images supported)"],
  ["type", `"story" | "bug" | "task" | "epic" (default "task")`],
  ["priority", `"lowest" | "low" | "med" | "high" | "highest" (default "med")`],
  ["status", "string — must match project.statuses (default first one)"],
  ["epicId", "string | null — ticket id of an epic"],
  ["storyPoints", "number | null"],
  ["labels", "string[]"],
  ["phase", "string | null — e.g. P1"],
  ["milestone", "string | null — e.g. M1"],
  ["sprint", "string | null"],
  ["fixVersion", "string | null"],
  ["components", "string[]"],
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-2 text-2xl font-bold">API Reference</h1>
      <p className="mt-2 text-sm text-zinc-600 ">
        REST API for project + ticket CRUD. Designed for AI agents (e.g. Claude Code reading a BRD)
        to bulk-create and update tickets.
      </p>

      <section className="mt-6 rounded-lg border p-4 ">
        <h2 className="text-lg font-semibold">Auth</h2>
        <p className="mt-1 text-sm">
          If <code className="rounded bg-zinc-100 px-1 ">PM_API_KEY</code> env var
          is set, all <code>/api/*</code> endpoints require it:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs ">
{`Authorization: Bearer <PM_API_KEY>
# or
X-API-Key: <PM_API_KEY>`}
        </pre>
        <p className="mt-2 text-xs text-zinc-500">
          Unset → open access (local dev only). Set in <code>.env.local</code>.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        <div className="mt-3 space-y-3">
          {SECTIONS.map((s, i) => (
            <div key={i} className="rounded-lg border p-4 ">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs ${
                    s.method === "GET"
                      ? "bg-green-100 text-green-700  "
                      : s.method === "POST"
                      ? "bg-blue-100 text-blue-700  "
                      : s.method === "PATCH"
                      ? "bg-amber-100 text-amber-700  "
                      : "bg-red-100 text-red-700  "
                  }`}
                >
                  {s.method}
                </span>
                <code className="font-mono text-sm">{s.path}</code>
              </div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              {s.body && (
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs ">
                  {s.body}
                </pre>
              )}
              {s.notes && <p className="mt-2 text-xs text-zinc-500">{s.notes}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border p-4 ">
        <h2 className="text-lg font-semibold">Ticket fields</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {FIELDS.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0 ">
                <td className="py-2 pr-4 font-mono">{k}</td>
                <td className="py-2 text-zinc-600 ">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 rounded-lg border p-4 ">
        <h2 className="text-lg font-semibold">Example: AI agent flow</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Read BRD / tech spec from file.</li>
          <li>Parse into epics + tickets.</li>
          <li><code>POST /api/import</code> with the full structured payload.</li>
          <li>On status change: <code>PATCH /api/tickets/[KEY]</code> with <code>{`{"status":"Done"}`}</code>.</li>
        </ol>
      </section>
    </div>
  );
}
