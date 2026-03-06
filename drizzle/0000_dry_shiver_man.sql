CREATE TABLE `duty_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`from_employee_id` integer,
	`to_employee_id` integer,
	`reallocation_date` integer,
	`reason` text DEFAULT 'High Stress Auto-Reallocation'
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`current_stress` integer DEFAULT 0,
	`username` text,
	`password` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_username_unique` ON `employees` (`username`);--> statement-breakpoint
CREATE TABLE `help_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_id` integer NOT NULL,
	`helper_id` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`timestamp` integer
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer,
	`content` text NOT NULL,
	`sent_at` integer,
	`is_read` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`message` text NOT NULL,
	`timestamp` integer,
	`read_status` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `stress_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`stress_level` integer NOT NULL,
	`total_score` integer,
	`answers` text,
	`logged_at` integer,
	`date` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`assigned_to_id` integer,
	`priority` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` integer
);
