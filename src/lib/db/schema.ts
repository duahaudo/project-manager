import { sqliteTable, text, integer, index, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  statuses: text("statuses", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`'["Backlog","To Do","In Progress","In Review","Done","Cancelled"]'`),
  ticketCounter: integer("ticket_counter").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  rank: text("rank").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  jiraBaseUrl: text("jira_base_url"),
  jiraEmail: text("jira_email"),
  jiraApiToken: text("jira_api_token"),
  jiraProjectKey: text("jira_project_key"),
  jiraStatusMap: text("jira_status_map", { mode: "json" }).$type<Record<string, string>>(),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnySQLiteColumn => tickets.id, { onDelete: "set null" }),
  relatedIds: text("related_ids", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("task"), // story|bug|task|epic
  status: text("status").notNull().default("Backlog"),
  priority: text("priority").notNull().default("med"), // lowest|low|med|high|highest
  labels: text("labels", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  storyPoints: integer("story_points"),
  sprint: text("sprint"),
  fixVersion: text("fix_version"),
  milestone: text("milestone"),
  phase: text("phase"),
  components: text("components", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  rank: text("rank").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  estimation: integer("estimation"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  brdRef: text("brd_ref"),
  techSpecRef: text("tech_spec_ref"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => [
  index("tickets_project_id_idx").on(t.projectId),
  index("tickets_project_status_idx").on(t.projectId, t.status),
  index("tickets_rank_idx").on(t.rank),
  index("tickets_parent_id_idx").on(t.parentId),
]);

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  author: text("author"),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Project = typeof projects.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  statusMap: Record<string, string>;
};

export function getJiraConfig(project: Project): JiraConfig | null {
  if (!project.jiraBaseUrl || !project.jiraEmail || !project.jiraApiToken || !project.jiraProjectKey) {
    return null;
  }
  return {
    baseUrl: project.jiraBaseUrl,
    email: project.jiraEmail,
    apiToken: project.jiraApiToken,
    projectKey: project.jiraProjectKey,
    statusMap: project.jiraStatusMap ?? {},
  };
}
