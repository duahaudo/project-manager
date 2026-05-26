"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions/projects";

const LOCAL_COLUMNS = ["Backlog", "To Do", "In Progress", "In Review", "Done", "Cancelled"];

export function NewProjectModal({
  hasProjects,
  onClose,
}: {
  hasProjects: boolean;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // First project must be default; user can't toggle off.
  const [isDefault, setIsDefault] = useState(!hasProjects);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // JIRA connector state
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraStatuses, setJiraStatuses] = useState<string[]>([]);
  const [jiraStatusMap, setJiraStatusMap] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleJiraToggle(checked: boolean) {
    setJiraEnabled(checked);
    if (!checked) {
      setJiraBaseUrl("");
      setJiraEmail("");
      setJiraApiToken("");
      setJiraProjectKey("");
      setJiraStatuses([]);
      setJiraStatusMap({});
      setConnectionError(null);
    }
  }

  async function testConnection() {
    setTestingConnection(true);
    setConnectionError(null);
    setJiraStatuses([]);
    try {
      const res = await fetch("/api/jira/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: jiraBaseUrl,
          email: jiraEmail,
          apiToken: jiraApiToken,
          projectKey: jiraProjectKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      setJiraStatuses(data.statuses ?? []);
      // Initialize statusMap — default each JIRA status to first matching local column or "Backlog"
      const initialMap: Record<string, string> = {};
      for (const s of (data.statuses ?? [])) {
        const match = LOCAL_COLUMNS.find((c) => c.toLowerCase() === s.toLowerCase());
        initialMap[s] = match ?? LOCAL_COLUMNS[0];
      }
      setJiraStatusMap(initialMap);
    } catch (e: unknown) {
      setConnectionError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTestingConnection(false);
    }
  }

  function save() {
    setError(null);
    if (!key.trim() || !name.trim()) {
      setError("KEY and Name are required");
      return;
    }
    if (jiraEnabled) {
      if (!jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim() || !jiraProjectKey.trim()) {
        setError("All JIRA fields are required when connector is enabled");
        return;
      }
      if (jiraStatuses.length === 0) {
        setError("Run Test Connection before saving a JIRA project");
        return;
      }
    }
    start(async () => {
      try {
        const res = await createProject({
          key: key.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          ...(jiraEnabled ? {
            jiraBaseUrl: jiraBaseUrl.trim(),
            jiraEmail: jiraEmail.trim(),
            jiraApiToken: jiraApiToken.trim(),
            jiraProjectKey: jiraProjectKey.trim().toUpperCase(),
            jiraStatusMap,
          } : {}),
        });
        onClose();
        router.push(`/projects/${res.key}/board`);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-lg border-b border-zinc-200 bg-white px-6 py-3">
          <h2 className="text-base font-semibold text-zinc-900">New Project</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 p-6">
          {/* JIRA toggle — above KEY field */}
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={jiraEnabled}
              onChange={(e) => handleJiraToggle(e.target.checked)}
            />
            Connect to JIRA
          </label>

          <div>
            <label className="text-xs text-zinc-500">KEY</label>
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. ABT"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 uppercase text-zinc-900"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isDefault}
              disabled={!hasProjects}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Make this the default project
            {!hasProjects && (
              <span className="text-xs text-zinc-500">(first project is always default)</span>
            )}
          </label>

          {/* JIRA Connector section */}
          {jiraEnabled && (
            <div className="border-l-2 border-indigo-400 pl-4 space-y-3 pt-1">
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">JIRA Connector</p>

              <div>
                <label className="text-xs text-zinc-500">Base URL</label>
                <input
                  value={jiraBaseUrl}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                  placeholder="https://company.atlassian.net"
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">Email</label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">API Token</label>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder="Your JIRA API token"
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">Project Key</label>
                <input
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                  placeholder="PROJ"
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 uppercase text-zinc-900"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testingConnection || !jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim() || !jiraProjectKey.trim()}
                  className="rounded bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                >
                  {testingConnection ? "Testing…" : "Test Connection"}
                </button>
                {jiraStatuses.length > 0 && (
                  <span className="text-green-600 text-xs">
                    Connected — {jiraStatuses.length} status{jiraStatuses.length === 1 ? "" : "es"} found
                  </span>
                )}
              </div>

              {connectionError && (
                <p className="text-red-600 text-sm">{connectionError}</p>
              )}

              {/* Status mapping */}
              {jiraStatuses.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-zinc-500">Status Mapping</p>
                  {jiraStatuses.map((status) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-32 truncate text-sm text-zinc-700" title={status}>
                        {status}
                      </span>
                      <span className="text-xs text-zinc-400">→</span>
                      <select
                        value={jiraStatusMap[status] ?? LOCAL_COLUMNS[0]}
                        onChange={(e) =>
                          setJiraStatusMap((prev) => ({ ...prev, [status]: e.target.value }))
                        }
                        className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                      >
                        {LOCAL_COLUMNS.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-3">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !key.trim() || !name.trim()}
            className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
