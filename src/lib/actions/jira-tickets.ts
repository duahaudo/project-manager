"use server";
import "server-only";
import { type JiraConfig, type Ticket } from "@/lib/db/schema";
import { type JiraCredentials } from "@/lib/jira/client";
import { fetchJiraIssues, createJiraIssue, updateJiraIssue, transitionJiraIssue, deleteJiraIssue } from "@/lib/jira/client";
import { mapJiraIssueToTicket } from "@/lib/jira/mappers";
import { resolveTransitionId } from "@/lib/jira/transitions";

function toCreds(jiraConfig: JiraConfig): JiraCredentials {
  return {
    baseUrl: jiraConfig.baseUrl,
    email: jiraConfig.email,
    apiToken: jiraConfig.apiToken,
  };
}

const PRIORITY_TO_JIRA: Record<string, string> = {
  highest: "Highest",
  high: "High",
  med: "Medium",
  low: "Low",
  lowest: "Lowest",
};

const TYPE_TO_JIRA: Record<string, string> = {
  story: "Story",
  bug: "Bug",
  task: "Task",
  epic: "Epic",
};

export async function listJiraTicketsByProject(
  jiraConfig: JiraConfig,
  projectId: string
): Promise<Ticket[]> {
  const creds = toCreds(jiraConfig);
  const issues = await fetchJiraIssues(creds, jiraConfig.projectKey);
  return issues.map((issue, index) => {
    const partial = mapJiraIssueToTicket(issue, projectId, jiraConfig.statusMap);
    const rank = String(index).padStart(8, "0");
    const updatedAt = new Date(issue.fields.updated);
    return { ...partial, rank, updatedAt };
  });
}

export async function createJiraTicket(
  jiraConfig: JiraConfig,
  input: {
    title: string;
    description?: string;
    type: string;
    priority: string;
    labels?: string[];
    fixVersion?: string;
  }
): Promise<{ id: string; key: string }> {
  const creds = toCreds(jiraConfig);
  const mappedType = TYPE_TO_JIRA[input.type] ?? "Task";
  const mappedPriority = PRIORITY_TO_JIRA[input.priority] ?? "Medium";

  const body = {
    fields: {
      project: { key: jiraConfig.projectKey },
      summary: input.title,
      issuetype: { name: mappedType },
      priority: { name: mappedPriority },
      labels: input.labels ?? [],
      fixVersions: input.fixVersion ? [{ name: input.fixVersion }] : [],
    },
  };

  return createJiraIssue(creds, body);
}

export async function updateJiraTicket(
  jiraConfig: JiraConfig,
  issueKey: string,
  input: {
    title?: string;
    description?: string;
    priority?: string;
    labels?: string[];
    status?: string;
  }
): Promise<void> {
  const creds = toCreds(jiraConfig);
  const fields: Record<string, unknown> = {};

  if (input.title !== undefined) {
    fields.summary = input.title;
  }
  if (input.priority !== undefined) {
    fields.priority = { name: PRIORITY_TO_JIRA[input.priority] ?? "Medium" };
  }
  if (input.labels !== undefined) {
    fields.labels = input.labels;
  }

  if (Object.keys(fields).length > 0) {
    await updateJiraIssue(creds, issueKey, { fields });
  }

  if (input.status !== undefined) {
    const transitionId = await resolveTransitionId(creds, issueKey, input.status);
    if (transitionId !== null) {
      await transitionJiraIssue(creds, issueKey, transitionId);
    }
  }
}

export async function moveJiraTicket(
  jiraConfig: JiraConfig,
  issueKey: string,
  targetStatus: string
): Promise<void> {
  const creds = toCreds(jiraConfig);
  const transitionId = await resolveTransitionId(creds, issueKey, targetStatus);
  if (transitionId === null) {
    throw new Error(`No transition found for status: ${targetStatus}`);
  }
  await transitionJiraIssue(creds, issueKey, transitionId);
}

export async function deleteJiraTicket(
  jiraConfig: JiraConfig,
  issueKey: string
): Promise<void> {
  const creds = toCreds(jiraConfig);
  await deleteJiraIssue(creds, issueKey);
}
