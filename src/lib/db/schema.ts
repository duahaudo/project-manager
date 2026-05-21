import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
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
});

export const epics = sqliteTable("epics", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  brdRef: text("brd_ref"),
  techSpecRef: text("tech_spec_ref"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  epicId: text("epic_id").references(() => epics.id, { onDelete: "set null" }),
  parentId: text("parent_id"),
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
export type Epic = typeof epics.$inferSelect;
export type Comment = typeof comments.$inferSelect;
