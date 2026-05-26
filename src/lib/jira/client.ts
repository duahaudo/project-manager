import "server-only";
import { JiraApiError, type JiraSearchResult, type JiraTransitionsResult, type JiraIssue } from "./types";

export type JiraCredentials = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

function authHeader(creds: JiraCredentials): string {
  return "Basic " + Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
}

export async function jiraFetch<T>(creds: JiraCredentials, path: string, init?: RequestInit): Promise<T> {
  const url = `${creds.baseUrl.replace(/\/$/, "")}/rest/api/3${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": authHeader(creds),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new JiraApiError(res.status, `JIRA ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchJiraIssues(
  creds: JiraCredentials,
  projectKey: string,
  fields?: string[]
): Promise<JiraIssue[]> {
  const defaultFields = [
    "summary", "description", "status", "priority", "issuetype",
    "labels", "fixVersions", "parent", "subtasks", "created", "updated", "assignee", "reporter",
  ];
  const fieldList = (fields ?? defaultFields).join(",");
  const all: JiraIssue[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const jql = encodeURIComponent(`project = ${projectKey} ORDER BY created ASC`);
    const result = await jiraFetch<JiraSearchResult>(
      creds,
      `/search?jql=${jql}&fields=${fieldList}&maxResults=${maxResults}&startAt=${startAt}`
    );
    all.push(...result.issues);
    if (all.length >= result.total || result.issues.length === 0) break;
    startAt += result.issues.length;
  }
  return all;
}

export async function fetchJiraIssue(creds: JiraCredentials, issueKey: string): Promise<JiraIssue> {
  return jiraFetch<JiraIssue>(creds, `/issue/${issueKey}`);
}

export async function fetchJiraTransitions(
  creds: JiraCredentials,
  issueKey: string
): Promise<JiraTransitionsResult> {
  return jiraFetch<JiraTransitionsResult>(creds, `/issue/${issueKey}/transitions`);
}

export async function createJiraIssue(
  creds: JiraCredentials,
  body: object
): Promise<{ id: string; key: string }> {
  return jiraFetch<{ id: string; key: string }>(creds, "/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateJiraIssue(
  creds: JiraCredentials,
  issueKey: string,
  body: object
): Promise<void> {
  await jiraFetch<void>(creds, `/issue/${issueKey}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function transitionJiraIssue(
  creds: JiraCredentials,
  issueKey: string,
  transitionId: string
): Promise<void> {
  await jiraFetch<void>(creds, `/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
}

export async function deleteJiraIssue(creds: JiraCredentials, issueKey: string): Promise<void> {
  await jiraFetch<void>(creds, `/issue/${issueKey}`, { method: "DELETE" });
}

export type JiraComment = {
  id: string;
  author: { displayName: string };
  body: unknown; // ADF document
  created: string;
};

export async function fetchJiraComments(
  creds: JiraCredentials,
  issueKey: string
): Promise<JiraComment[]> {
  type CommentsResult = { comments: JiraComment[]; total: number };
  const result = await jiraFetch<CommentsResult>(creds, `/issue/${issueKey}/comment`);
  return result.comments;
}

export async function addJiraComment(
  creds: JiraCredentials,
  issueKey: string,
  bodyText: string
): Promise<void> {
  await jiraFetch<void>(creds, `/issue/${issueKey}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: {
        version: 1,
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: bodyText }] }],
      },
    }),
  });
}

export async function fetchJiraProjectStatuses(
  creds: JiraCredentials,
  projectKey: string
): Promise<string[]> {
  type StatusesResponse = { values: { name: string }[] };
  const result = await jiraFetch<StatusesResponse>(
    creds,
    `/project/${projectKey}/statuses`
  ).catch(async () => {
    const sample = await fetchJiraIssues(creds, projectKey, ["status"]);
    const names = Array.from(new Set(sample.map((i) => i.fields.status.name)));
    return { values: names.map((n) => ({ name: n })) };
  });
  if (!Array.isArray(result.values)) return [];
  return result.values.filter((v) => typeof v.name === "string").map((v) => v.name);
}
