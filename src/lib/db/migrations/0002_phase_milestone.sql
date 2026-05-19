ALTER TABLE `tickets` ADD `milestone` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `phase` text;--> statement-breakpoint
ALTER TABLE `tickets` DROP COLUMN `assignee`;--> statement-breakpoint
ALTER TABLE `tickets` DROP COLUMN `reporter`;
