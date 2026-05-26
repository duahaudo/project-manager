import "server-only";
import { type JiraCredentials, fetchJiraTransitions } from "./client";

const cache = new Map<string, string>();

export async function resolveTransitionId(
  creds: JiraCredentials,
  issueKey: string,
  targetStatus: string
): Promise<string | null> {
  const cacheKey = `${creds.baseUrl}:${issueKey}:${targetStatus}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const result = await fetchJiraTransitions(creds, issueKey);
  for (const t of result.transitions) {
    const k = `${creds.baseUrl}:${issueKey}:${t.to.name}`;
    cache.set(k, t.id);
  }
  return cache.get(cacheKey) ?? null;
}

export function clearTransitionCache() {
  cache.clear();
}
