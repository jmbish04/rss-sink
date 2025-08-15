PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sources` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`identifier` text NOT NULL,
	`created_at` integer DEFAULT '"2025-08-15T04:02:08.483Z"' NOT NULL,
	`last_fetched_external_id` text
);
--> statement-breakpoint
INSERT INTO `__new_sources`("id", "type", "name", "identifier", "created_at", "last_fetched_external_id") SELECT "id", "type", "name", "identifier", "created_at", "last_fetched_external_id" FROM `sources`;--> statement-breakpoint
DROP TABLE `sources`;--> statement-breakpoint
ALTER TABLE `__new_sources` RENAME TO `sources`;--> statement-breakpoint
PRAGMA foreign_keys=ON;