CREATE INDEX IF NOT EXISTS `tickets_project_id_idx` ON `tickets` (`project_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tickets_project_status_idx` ON `tickets` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tickets_rank_idx` ON `tickets` (`rank`);
