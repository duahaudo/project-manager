ALTER TABLE `tickets` ADD `sprint` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `fix_version` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `components` text DEFAULT '[]';