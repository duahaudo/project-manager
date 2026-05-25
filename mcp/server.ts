import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, asc, desc, eq, like, or } from "drizzle-orm";
import * as schema from "../src/lib/db/schema.js";
import { midpoint, initialRank } from "../src/lib/rank.js";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const server = new Server(
  { name: "project-manager", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "List all projects in the Project Manager",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_ticket",
      description: "Get a single ticket by its key (e.g. ABT-1)",
      inputSchema: {
        type: "object",
        required: ["key"],
        properties: {
          key: { type: "string", description: "Ticket key (e.g. ABT-1)" },
        },
      },
    },
    {
      name: "search_tickets",
      description: "Search and filter tickets across projects",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Filter by project key (e.g. ABT)" },
          query: { type: "string", description: "Text search in title and description" },
          status: { type: "string", description: "Filter by status (e.g. Backlog, In Progress, Done)" },
          type: {
            type: "string",
            enum: ["story", "bug", "task", "epic"],
            description: "Filter by ticket type",
          },
          priority: {
            type: "string",
            enum: ["lowest", "low", "med", "high", "highest"],
            description: "Filter by priority",
          },
          sprint: { type: "string", description: "Filter by sprint name" },
          milestone: { type: "string", description: "Filter by milestone" },
          phase: { type: "string", description: "Filter by phase" },
          limit: { type: "number", description: "Max results (default: 50)" },
        },
      },
    },
    {
      name: "create_ticket",
      description: "Create a new ticket in a project",
      inputSchema: {
        type: "object",
        required: ["projectKey", "title"],
        properties: {
          projectKey: { type: "string", description: "Project key (e.g. ABT)" },
          title: { type: "string", description: "Ticket title" },
          description: { type: "string", description: "Ticket description (markdown supported)" },
          type: {
            type: "string",
            enum: ["story", "bug", "task", "epic"],
            default: "task",
            description: "Ticket type",
          },
          priority: {
            type: "string",
            enum: ["lowest", "low", "med", "high", "highest"],
            default: "med",
            description: "Priority level",
          },
          status: { type: "string", description: "Initial status (defaults to first project status)" },
          epicId: { type: "string", description: "Epic ticket ID to link this ticket to" },
          parentId: { type: "string", description: "Parent ticket ID (for tasks under a story)" },
          storyPoints: { type: "number", description: "Story points estimate" },
          sprint: { type: "string", description: "Sprint name" },
          milestone: { type: "string", description: "Milestone name" },
          phase: { type: "string", description: "Phase name" },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Labels/tags for the ticket",
          },
        },
      },
    },
    {
      name: "update_ticket",
      description: "Update an existing ticket by its key (e.g. ABT-1)",
      inputSchema: {
        type: "object",
        required: ["key"],
        properties: {
          key: { type: "string", description: "Ticket key to update (e.g. ABT-1)" },
          title: { type: "string", description: "New title" },
          description: { type: "string", description: "New description (markdown)" },
          type: { type: "string", enum: ["story", "bug", "task", "epic"] },
          priority: { type: "string", enum: ["lowest", "low", "med", "high", "highest"] },
          status: { type: "string", description: "New status" },
          storyPoints: { type: "number", description: "Story points" },
          sprint: { type: "string", description: "Sprint name" },
          milestone: { type: "string", description: "Milestone name" },
          phase: { type: "string", description: "Phase name" },
          labels: { type: "array", items: { type: "string" } },
          epicId: { type: "string", description: "Epic ticket ID" },
          parentId: { type: "string", description: "Parent ticket ID" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_projects") {
      const projects = await db
        .select()
        .from(schema.projects)
        .orderBy(asc(schema.projects.rank));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              projects.map((p) => ({
                id: p.id,
                key: p.key,
                name: p.name,
                description: p.description,
                statuses: p.statuses,
                ticketCounter: p.ticketCounter,
                isDefault: p.isDefault,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_ticket") {
      const { key } = args as { key: string };
      const rows = await db
        .select()
        .from(schema.tickets)
        .where(eq(schema.tickets.key, key))
        .limit(1);
      if (!rows[0]) {
        return {
          content: [{ type: "text", text: `Ticket ${key} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }

    if (name === "search_tickets") {
      const {
        projectKey,
        query,
        status,
        type,
        priority,
        sprint,
        milestone,
        phase,
        limit = 50,
      } = args as {
        projectKey?: string;
        query?: string;
        status?: string;
        type?: string;
        priority?: string;
        sprint?: string;
        milestone?: string;
        phase?: string;
        limit?: number;
      };

      const conditions: ReturnType<typeof eq>[] = [];

      if (projectKey) {
        const proj = await db
          .select({ id: schema.projects.id })
          .from(schema.projects)
          .where(eq(schema.projects.key, projectKey))
          .limit(1);
        if (!proj[0]) {
          return {
            content: [{ type: "text", text: `Project ${projectKey} not found` }],
            isError: true,
          };
        }
        conditions.push(eq(schema.tickets.projectId, proj[0].id) as ReturnType<typeof eq>);
      }

      if (status) conditions.push(eq(schema.tickets.status, status) as ReturnType<typeof eq>);
      if (type) conditions.push(eq(schema.tickets.type, type) as ReturnType<typeof eq>);
      if (priority) conditions.push(eq(schema.tickets.priority, priority) as ReturnType<typeof eq>);
      if (sprint) conditions.push(eq(schema.tickets.sprint, sprint) as ReturnType<typeof eq>);
      if (milestone) conditions.push(eq(schema.tickets.milestone, milestone) as ReturnType<typeof eq>);
      if (phase) conditions.push(eq(schema.tickets.phase, phase) as ReturnType<typeof eq>);
      if (query) {
        conditions.push(
          or(
            like(schema.tickets.title, `%${query}%`),
            like(schema.tickets.description, `%${query}%`)
          ) as ReturnType<typeof eq>
        );
      }

      const rows = await db
        .select()
        .from(schema.tickets)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(schema.tickets.rank))
        .limit(limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: rows.length,
                tickets: rows.map((t) => ({
                  id: t.id,
                  key: t.key,
                  title: t.title,
                  type: t.type,
                  status: t.status,
                  priority: t.priority,
                  storyPoints: t.storyPoints,
                  sprint: t.sprint,
                  milestone: t.milestone,
                  phase: t.phase,
                  labels: t.labels,
                  epicId: t.epicId,
                  parentId: t.parentId,
                  description: t.description,
                  createdAt: t.createdAt,
                  updatedAt: t.updatedAt,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "create_ticket") {
      const {
        projectKey,
        title,
        description,
        type = "task",
        priority = "med",
        status,
        epicId,
        parentId,
        storyPoints,
        sprint,
        milestone,
        phase,
        labels,
      } = args as {
        projectKey: string;
        title: string;
        description?: string;
        type?: string;
        priority?: string;
        status?: string;
        epicId?: string;
        parentId?: string;
        storyPoints?: number;
        sprint?: string;
        milestone?: string;
        phase?: string;
        labels?: string[];
      };

      const proj = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.key, projectKey))
        .limit(1);
      if (!proj[0]) {
        return {
          content: [{ type: "text", text: `Project ${projectKey} not found` }],
          isError: true,
        };
      }
      const project = proj[0];
      const nextNum = project.ticketCounter + 1;
      const key = `${project.key}-${nextNum}`;
      const ticketStatus = status ?? (project.statuses[0] ?? "Backlog");

      const last = await db
        .select({ rank: schema.tickets.rank })
        .from(schema.tickets)
        .where(
          and(
            eq(schema.tickets.projectId, project.id),
            eq(schema.tickets.status, ticketStatus)
          )
        )
        .orderBy(desc(schema.tickets.rank))
        .limit(1);
      const rank = last[0] ? midpoint(last[0].rank, null) : initialRank();

      const id = randomUUID();
      await db.insert(schema.tickets).values({
        id,
        key,
        projectId: project.id,
        title,
        description: description ?? null,
        type: type as "story" | "bug" | "task" | "epic",
        priority: priority as "lowest" | "low" | "med" | "high" | "highest",
        status: ticketStatus,
        epicId: epicId ?? null,
        parentId: parentId ?? null,
        storyPoints: storyPoints ?? null,
        sprint: sprint ?? null,
        milestone: milestone ?? null,
        phase: phase ?? null,
        labels: labels ?? [],
        relatedIds: [],
        rank,
      });

      await db
        .update(schema.projects)
        .set({ ticketCounter: nextNum })
        .where(eq(schema.projects.id, project.id));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id, key, message: `Ticket ${key} created` }, null, 2),
          },
        ],
      };
    }

    if (name === "update_ticket") {
      const { key, ...fields } = args as {
        key: string;
        title?: string;
        description?: string;
        type?: string;
        priority?: string;
        status?: string;
        storyPoints?: number;
        sprint?: string;
        milestone?: string;
        phase?: string;
        labels?: string[];
        epicId?: string;
        parentId?: string;
      };

      const existing = await db
        .select({ id: schema.tickets.id })
        .from(schema.tickets)
        .where(eq(schema.tickets.key, key))
        .limit(1);
      if (!existing[0]) {
        return {
          content: [{ type: "text", text: `Ticket ${key} not found` }],
          isError: true,
        };
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.title !== undefined) updates.title = fields.title;
      if (fields.description !== undefined) updates.description = fields.description;
      if (fields.type !== undefined) updates.type = fields.type;
      if (fields.priority !== undefined) updates.priority = fields.priority;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.storyPoints !== undefined) updates.storyPoints = fields.storyPoints;
      if (fields.sprint !== undefined) updates.sprint = fields.sprint;
      if (fields.milestone !== undefined) updates.milestone = fields.milestone;
      if (fields.phase !== undefined) updates.phase = fields.phase;
      if (fields.labels !== undefined) updates.labels = fields.labels;
      if (fields.epicId !== undefined) updates.epicId = fields.epicId;
      if (fields.parentId !== undefined) updates.parentId = fields.parentId;

      await db
        .update(schema.tickets)
        .set(updates)
        .where(eq(schema.tickets.id, existing[0].id));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ key, message: `Ticket ${key} updated` }, null, 2),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
