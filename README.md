# Project Manager

Local-first JIRA-lite for solo developers and AI-driven workflows. Runs entirely on your machine — SQLite file, no cloud, no accounts.

Designed so an AI agent (Claude Code, Cursor, etc.) can read a BRD or tech spec, parse it into epics + tickets, and POST them to a local REST API. You then drag tickets across a kanban board to manage status.

## Stack

- **Next.js 16** (App Router, Webpack — Turbopack disabled due to a Node-subprocess issue with nvm-managed Node)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** — light theme only
- **SQLite** via **better-sqlite3** + **Drizzle ORM** (file at `data/app.db`)
- **@dnd-kit** — kanban drag-and-drop
- **react-markdown** + **rehype-raw** + **remark-gfm** — ticket descriptions
- **emoji-picker-react** — emoji picker in description editor

## Getting Started

Requires Node.js ≥ 20.

```bash
# Install
npm install

# Apply DB migrations (creates data/app.db on first run)
npm run db:migrate

# Start dev server on port 9005
./scripts/dev.sh -p 9005
# or
npm run dev
```

Open <http://localhost:9005>. The app auto-redirects to your default project's board on every visit.

> The `scripts/dev.sh` wrapper pins Node v22 explicitly. The harness/preview tooling in some environments resolves `node` from a stale nvm path; the wrapper avoids that.

## Features

### Projects
- Multiple projects, each with its own ticket counter (`ABT-1`, `ABT-2`, …)
- One project is always marked **default** (gold star). Toggling default on another auto-clears the old one. You can never end up with zero defaults
- First visit → default project's board. `← Projects` link opens the full list via `/?all=1`
- New Project modal with default-toggle checkbox

### Board
- Always grouped by status: `Backlog → To Do → In Progress → In Review → Done → Cancelled`
- Drag cards across columns; rank persisted via lexorank (no full re-numbering)
- Cards show key, title, priority arrow, and `P:`/`M:`/`S:` chips for phase/milestone/sprint
- Click a card → opens edit modal (no route navigation)
- Deep-link `/projects/[KEY]/tickets/[TICKET]` redirects to board with modal auto-open

### Filters
- Filter bar above the board: **Epic, Phase, Milestone, Sprint, Fix Version, Priority, Type**
- URL-driven (`?phase=P2&priority=high`); shareable
- Active filters highlight indigo; "Clear" button appears when any filter is set
- Phase / Milestone / Sprint / Fix Version dropdowns auto-populate from existing ticket values

### Ticket modal (create + edit, same component)
- Large centered modal (max-w-5xl), light theme
- **Edit mode**: shows key, type, created/updated timestamps, Delete button
- **Create mode**: hides those; shows Cancel + Create buttons
- Same footer pattern: Delete (left, edit only) · Cancel + primary button (right)
- Click Save/Create/Delete → API call → modal closes → board refreshes to show latest data
- Fields:
  - **Title** (required)
  - **Description** — markdown with toolbar: **B I U S**, link, numbered/bullet list, quote, inline code, code block, emoji picker
    - Paste image directly → embedded as base64 data URL
    - Links open in new tab; raw HTML allowed (rehype-raw)
  - **Status / Type / Priority** — dropdowns
  - **Phase / Milestone / Sprint / Fix Version** — combobox: focus shows existing values, type filters, "+ Add" appears for new values
  - **Story Points** — number

### Combobox (autocomplete + add)
- Focus → shows full options list
- Type → filters by substring
- Exact match missing + non-empty input → "**+ Add** `<value>`" button
- ↑/↓ keyboard navigate, Enter selects, Esc cancels, click outside commits

### REST API

All endpoints under `/api/`. Optional bearer auth via `PM_API_KEY` env var.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[key]` | Project + epics + tickets |
| GET | `/api/tickets?projectKey=ABT` | List tickets |
| POST | `/api/tickets` | Create one or bulk (`{ "tickets": [...] }`) |
| GET | `/api/tickets/[KEY]` | Get ticket |
| PATCH | `/api/tickets/[KEY]` | Partial update — same shape as DnD uses |
| DELETE | `/api/tickets/[KEY]` | Delete |
| GET | `/api/epics?projectKey=ABT` | List epics |
| POST | `/api/epics` | Create epic |
| GET | `/api/export?projectKey=ABT` | Download full JSON |
| POST | `/api/import` | Bulk-import structured payload (BRD → tickets pipeline) |

Auth header:
```
Authorization: Bearer <PM_API_KEY>
# or
X-API-Key: <PM_API_KEY>
```

Unset = open access (intended for local dev only). Full docs at <http://localhost:9005/api-docs>.

### Import / Export
- **Export**: `GET /api/export?projectKey=ABT` → JSON file download with project + all epics + all tickets
- **Import**: paste a structured payload, epics linked to tickets via `_localId` / `epicLocalId`. Project is reused if its `key` already exists. UI at `/projects/[KEY]/import`

## AI agent workflow

```bash
# 1. AI reads BRD file
# 2. Parses into epics + tickets
# 3. POSTs:

curl -X POST http://localhost:9005/api/import \
  -H "content-type: application/json" \
  -d '{
    "project": {"key": "ABT", "name": "AI Bot Trading"},
    "epics": [
      {"title": "Authentication", "_localId": "e1"},
      {"title": "Trading Engine", "_localId": "e2"}
    ],
    "tickets": [
      {"title": "Login UI", "type": "story", "priority": "high",
       "epicLocalId": "e1", "phase": "P1", "milestone": "M1"},
      {"title": "Order book sync", "type": "task",
       "epicLocalId": "e2", "storyPoints": 5}
    ]
  }'

# 4. Later, after implementation:
curl -X PATCH http://localhost:9005/api/tickets/ABT-1 \
  -H "content-type: application/json" \
  -d '{"status": "Done"}'
```

## Project layout

```
src/
├── app/
│   ├── page.tsx                              # Home: redirect to default project, or list if ?all=1
│   ├── layout.tsx
│   ├── globals.css                           # Light theme locked via color-scheme
│   ├── api-docs/page.tsx                     # /api-docs reference
│   ├── api/
│   │   ├── projects/{route.ts, [key]/route.ts}
│   │   ├── tickets/{route.ts, [key]/route.ts}
│   │   ├── epics/route.ts
│   │   ├── import/route.ts
│   │   └── export/route.ts
│   └── projects/[key]/
│       ├── layout.tsx                        # Sticky header + nav
│       ├── board/page.tsx                    # Kanban + filters
│       ├── backlog/page.tsx                  # Flat table
│       ├── import/page.tsx                   # Import/Export UI
│       └── tickets/[ticketKey]/page.tsx      # Redirects to board?ticket=KEY
├── components/
│   ├── board/{Board,BoardClient,Column,TicketCard,Filters}.tsx
│   ├── project/{ProjectsList,NewProjectModal}.tsx
│   ├── ticket/{TicketModal,TicketForm,MarkdownEditor}.tsx
│   └── ui/Combobox.tsx
└── lib/
    ├── actions/{projects,tickets}.ts         # Server actions used by UI
    ├── db/{schema,client,migrate}.ts
    ├── api-auth.ts                           # Bearer/X-API-Key check
    ├── rank.ts                               # Lexorank midpoint
    └── utils.ts
```

## Data model

```
Project (id, key, name, statuses[], ticketCounter, isDefault)
  └─ Epic (id, projectId, title, description, brdRef, techSpecRef)
        └─ Ticket (id, key, projectId, epicId?, parentId?,
                   title, description,
                   type, status, priority,
                   labels[], storyPoints,
                   sprint, fixVersion, milestone, phase, components[],
                   rank, dueDate)
              └─ Comment (id, ticketId, author, body)
```

Indexes on `tickets.projectId`, `(projectId, status)`, and `rank` for board queries.

## Scripts

```bash
npm run dev          # Next dev (uses webpack; pinned via scripts/dev.sh for nvm)
npm run build        # Production build
npm start            # Production server
npm run lint
npm run db:generate  # Generate Drizzle migration from schema diff
npm run db:migrate   # Apply pending migrations
npm run db:seed      # (placeholder)
```

## Environment

Optional `.env.local`:

```
PM_API_KEY=your-secret-here   # If set, all /api/* require Bearer auth. Unset = open.
```

## Notes / known constraints

- **Webpack, not Turbopack** — Turbopack spawns a child Node for the PostCSS transform and resolves `node` from PATH, which under nvm picks up an old Node version. Webpack avoids that subprocess. If your environment doesn't have this issue, you can switch back by removing `--webpack` from `scripts/dev.sh`.
- **Light theme only** — `color-scheme: light` is forced; system dark mode is ignored.
- **SQLite single-writer** — fine for solo use; not designed for multi-user concurrent writes.
- **Markdown is sanitized via rehype-raw**, but description content is whatever you/the API put in. Don't paste untrusted HTML.
