"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE = `{
  "project": { "key": "ABT", "name": "AI Bot Trading" },
  "epics": [
    { "title": "Authentication", "_localId": "e1" },
    { "title": "Trading Engine", "_localId": "e2" }
  ],
  "tickets": [
    { "title": "Login UI", "type": "story", "priority": "high", "epicLocalId": "e1" },
    { "title": "Order book sync", "type": "task", "epicLocalId": "e2", "storyPoints": 5 }
  ]
}`;

export function ImportExportPanel({ projectKey }: { projectKey: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function runImport() {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const body = text.trim() ? JSON.parse(text) : null;
        if (!body) throw new Error("empty body");
        // ensure target project key
        if (!body.project) body.project = { key: projectKey, name: projectKey };
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "import failed");
        setResult(`Imported ${data.epics.length} epics, ${data.tickets.length} tickets`);
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-semibold">Export</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Download all tickets, epics, and project config as JSON.
        </p>
        <a
          href={`/api/export?projectKey=${projectKey}`}
          className="inline-block rounded bg-zinc-200 px-4 py-2 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          Download {projectKey}-export.json
        </a>
      </section>

      <section className="rounded-lg border p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-semibold">Import</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Paste JSON spec to bulk-create epics + tickets. Existing project keys are reused.
        </p>
        <details className="mb-2">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:underline">
            Show example schema
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {EXAMPLE}
          </pre>
        </details>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste JSON here…"
          className="w-full rounded border px-3 py-2 font-mono text-xs dark:bg-zinc-900 dark:border-zinc-700"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={pending || !text.trim()}
            onClick={runImport}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import"}
          </button>
          <button
            onClick={() => setText(EXAMPLE)}
            className="text-sm text-zinc-500 hover:underline"
          >
            Fill example
          </button>
        </div>
        {result && <p className="mt-3 text-sm text-green-600">{result}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
