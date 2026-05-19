ALTER TABLE `projects` ADD `is_default` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Mark the oldest project as default if any projects exist.
UPDATE projects SET is_default = 1
WHERE id = (SELECT id FROM projects ORDER BY created_at ASC LIMIT 1);
