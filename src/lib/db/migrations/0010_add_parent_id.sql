-- Clean orphan parent_id references before enforcing the FK
UPDATE tickets SET parent_id = NULL WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM tickets);
--> statement-breakpoint
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
  FOREIGN KEY (epic_id) REFERENCES tickets_new(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES tickets_new(id) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO tickets_new (
  id, key, project_id, epic_id, parent_id, related_ids,
  title, description, type, status, priority,
  labels, story_points, sprint, fix_version, milestone, phase, components,
  rank, start_date, end_date, estimation, due_date,
  brd_ref, tech_spec_ref,
  created_at, updated_at
)
SELECT
  id, key, project_id, epic_id, parent_id, related_ids,
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
CREATE UNIQUE INDEX tickets_key_unique ON tickets (key);
--> statement-breakpoint
CREATE INDEX tickets_project_id_idx ON tickets (project_id);
--> statement-breakpoint
CREATE INDEX tickets_project_status_idx ON tickets (project_id, status);
--> statement-breakpoint
CREATE INDEX tickets_rank_idx ON tickets (rank);
--> statement-breakpoint
CREATE INDEX tickets_parent_id_idx ON tickets (parent_id);
