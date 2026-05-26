export type AdfNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type AdfDocument = {
  version: number;
  type: "doc";
  content: AdfNode[];
};

export type JiraIssueFields = {
  summary: string;
  description: AdfDocument | null;
  status: { name: string; id: string };
  priority: { name: string } | null;
  issuetype: { name: string; subtask: boolean };
  labels: string[];
  fixVersions: { name: string }[];
  assignee: { displayName: string; emailAddress: string } | null;
  reporter: { displayName: string } | null;
  created: string;
  updated: string;
  parent?: { key: string; id: string } | null;
  subtasks: { key: string; id: string; fields: { summary: string; status: { name: string } } }[];
  [key: string]: unknown;
};

export type JiraIssue = {
  id: string;
  key: string;
  fields: JiraIssueFields;
};

export type JiraSearchResult = {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
};

export type JiraTransition = {
  id: string;
  name: string;
  to: { name: string; id: string };
};

export type JiraTransitionsResult = {
  transitions: JiraTransition[];
};

export class JiraApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "JiraApiError";
  }
}
