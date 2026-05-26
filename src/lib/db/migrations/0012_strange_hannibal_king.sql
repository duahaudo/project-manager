-- Migrate epic_id → parent_id for tickets that only have epic_id set
UPDATE tickets SET parent_id = epic_id WHERE epic_id IS NOT NULL AND parent_id IS NULL;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`related_ids` text DEFAULT '[]' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'task' NOT NULL,
	`status` text DEFAULT 'Backlog' NOT NULL,
	`priority` text DEFAULT 'med' NOT NULL,
	`labels` text DEFAULT '[]',
	`story_points` integer,
	`sprint` text,
	`fix_version` text,
	`milestone` text,
	`phase` text,
	`components` text DEFAULT '[]',
	`rank` text NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`estimation` integer,
	`due_date` integer,
	`brd_ref` text,
	`tech_spec_ref` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id", "key", "project_id", "parent_id", "related_ids", "title", "description", "type", "status", "priority", "labels", "story_points", "sprint", "fix_version", "milestone", "phase", "components", "rank", "start_date", "end_date", "estimation", "due_date", "brd_ref", "tech_spec_ref", "created_at", "updated_at") SELECT "id", "key", "project_id", "parent_id", "related_ids", "title", "description", "type", "status", "priority", "labels", "story_points", "sprint", "fix_version", "milestone", "phase", "components", "rank", "start_date", "end_date", "estimation", "due_date", "brd_ref", "tech_spec_ref", "created_at", "updated_at" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_key_unique` ON `tickets` (`key`);--> statement-breakpoint
CREATE INDEX `tickets_project_id_idx` ON `tickets` (`project_id`);--> statement-breakpoint
CREATE INDEX `tickets_project_status_idx` ON `tickets` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `tickets_rank_idx` ON `tickets` (`rank`);--> statement-breakpoint
CREATE INDEX `tickets_parent_id_idx` ON `tickets` (`parent_id`);