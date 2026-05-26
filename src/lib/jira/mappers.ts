import { type JiraIssue } from "./types";
import { type Ticket } from "@/lib/db/schema";

const PRIORITY_MAP: Record<string, Ticket["priority"]> = {
  Highest: "highest",
  High: "high",
  Medium: "med",
  Low: "low",
  Lowest: "lowest",
};

const TYPE_MAP: Record<string, Ticket["type"]> = {
  Story: "story",
  Bug: "bug",
  Task: "task",
  Epic: "epic",
  Subtask: "task",
  "Sub-task": "task",
};

export function mapJiraIssueToTicket(
  issue: JiraIssue,
  projectId: string,
  statusMap: Record<string, string>,
  storyPointsField?: string
): Omit<Ticket, "rank" | "updatedAt"> {
  const f = issue.fields;
  const rawStatus = f.status.name;
  const mappedStatus = statusMap[rawStatus] ?? rawStatus;
  const rawPriority = f.priority?.name ?? "Medium";
  const rawType = f.issuetype.name;
  const spValue = storyPointsField ? (f[storyPointsField] as number | null) : null;

  return {
    id: issue.id,
    key: issue.key,
    projectId,
    parentId: f.parent?.id ?? null,
    relatedIds: [],
    title: f.summary,
    description: f.description ? JSON.stringify(f.description) : null,
    type: TYPE_MAP[rawType] ?? "task",
    status: mappedStatus,
    priority: PRIORITY_MAP[rawPriority] ?? "med",
    labels: f.labels ?? [],
    storyPoints: typeof spValue === "number" ? spValue : null,
    sprint: null,
    fixVersion: f.fixVersions?.[0]?.name ?? null,
    milestone: null,
    phase: null,
    components: [],
    startDate: null,
    endDate: null,
    estimation: null,
    dueDate: null,
    brdRef: null,
    techSpecRef: null,
    createdAt: new Date(f.created),
  };
}
