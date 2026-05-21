-- Step 1: Add staging column for new epic_id self-reference
ALTER TABLE tickets ADD COLUMN new_epic_id TEXT;
--> statement-breakpoint
-- Step 2a: Add brd_ref and tech_spec_ref columns before table recreation
ALTER TABLE tickets ADD COLUMN brd_ref TEXT;
--> statement-breakpoint
ALTER TABLE tickets ADD COLUMN tech_spec_ref TEXT;
--> statement-breakpoint
-- Step 2b: Insert epic rows into tickets as type='epic'
INSERT INTO tickets (
  id, key, project_id, epic_id, parent_id, related_ids,
  title, description, type, status, priority,
  labels, story_points, sprint, fix_version, milestone, phase, components,
  rank, start_date, end_date, estimation, due_date,
  brd_ref, tech_spec_ref,
  created_at, updated_at
)
SELECT
  e.id,
  p.key || '-' || (p.ticket_counter + ROW_NUMBER() OVER (PARTITION BY e.project_id ORDER BY e.created_at)),
  e.project_id,
  NULL,
  NULL,
  '[]',
  e.title,
  e.description,
  'epic',
  'To Do',
  'med',
  '[]',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  '0|hzzzzz:',
  NULL,
  NULL,
  NULL,
  NULL,
  e.brd_ref,
  e.tech_spec_ref,
  e.created_at,
  e.created_at
FROM epics e
JOIN projects p ON p.id = e.project_id;
--> statement-breakpoint
-- Update each project's ticket_counter by the number of epics migrated
UPDATE projects
SET ticket_counter = ticket_counter + (
  SELECT COUNT(*) FROM epics WHERE project_id = projects.id
);
--> statement-breakpoint
-- Step 3: Copy existing epic_id values into staging column
-- No remapping needed: epic.id == new ticket.id
UPDATE tickets SET new_epic_id = epic_id;
--> statement-breakpoint
-- Step 4a: Recreate tickets table with self-referencing epic_id FK and brd_ref/tech_spec_ref columns
CREATE TABLE tickets_new (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL,
  project_id TEXT NOT NULL,
  epic_id TEXT,
  parent_id TEXT,
  related_ids TEXT NOT NULL DEFAULT '[]',
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'task',
  status TEXT NOT NULL DEFAULT 'Backlog',
  priority TEXT NOT NULL DEFAULT 'med',
  labels TEXT DEFAULT '[]',
  story_points INTEGER,
  sprint TEXT,
  fix_version TEXT,
  milestone TEXT,
  phase TEXT,
  components TEXT DEFAULT '[]',
  rank TEXT NOT NULL,
  start_date INTEGER,
  end_date INTEGER,
  estimation REAL,
  due_date INTEGER,
  brd_ref TEXT,
  tech_spec_ref TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (epic_id) REFERENCES tickets_new(id) ON DELETE SET NULL
);
--> statement-breakpoint
-- Step 4b: Copy all rows into the new table
INSERT INTO tickets_new (
  id, key, project_id, epic_id, parent_id, related_ids,
  title, description, type, status, priority,
  labels, story_points, sprint, fix_version, milestone, phase, components,
  rank, start_date, end_date, estimation, due_date,
  brd_ref, tech_spec_ref,
  created_at, updated_at
)
SELECT
  id, key, project_id, new_epic_id, parent_id, related_ids,
  title, description, type, status, priority,
  labels, story_points, sprint, fix_version, milestone, phase, components,
  rank, start_date, end_date, estimation, due_date,
  brd_ref, tech_spec_ref,
  created_at, updated_at
FROM tickets;
--> statement-breakpoint
DROP TABLE tickets;
--> statement-breakpoint
ALTER TABLE tickets_new RENAME TO tickets;
--> statement-breakpoint
-- Step 5: Recreate indexes
CREATE UNIQUE INDEX tickets_key_unique ON tickets (key);
--> statement-breakpoint
CREATE INDEX tickets_project_id_idx ON tickets (project_id);
--> statement-breakpoint
CREATE INDEX tickets_project_status_idx ON tickets (project_id, status);
--> statement-breakpoint
CREATE INDEX tickets_rank_idx ON tickets (rank);
--> statement-breakpoint
-- Step 6: Drop epics table
DROP TABLE epics;
