import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


// ================== EMPLOYEES ==================

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin | employee
  currentStress: integer("current_stress").default(0),
  username: text("username").unique(),
  password: text("password"),
});


// ================== TASKS ==================

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  assignedToId: integer("assigned_to_id"),
  priority: text("priority").notNull(), // Low Medium High
  status: text("status").notNull().default("Pending"),
  createdAt: integer("created_at").default(Date.now()),
});


// ================== STRESS LOGS ==================

export const stressLogs = sqliteTable("stress_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id").notNull(),
  stressLevel: integer("stress_level").notNull(),
  totalScore: integer("total_score"),
  answers: text("answers"), // JSON string
  loggedAt: integer("logged_at").default(Date.now()),
  date: text("date"),
});


// ================== DUTY REALLOCATION ==================

export const dutyLogs = sqliteTable("duty_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id"),
  fromEmployeeId: integer("from_employee_id"),
  toEmployeeId: integer("to_employee_id"),
  reallocationDate: integer("reallocation_date").default(Date.now()),
  reason: text("reason").default("High Stress Auto-Reallocation"),
});


// ================== MESSAGES ==================

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // ✅ Links message to a help request conversation thread
  helpRequestId: integer("help_request_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  sentAt: integer("sent_at").default(Date.now()),
});


// ================== NOTIFICATIONS ==================

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id").notNull(),
  message: text("message").notNull(),
  timestamp: integer("timestamp").default(Date.now()),
  readStatus: integer("read_status").default(0),
});


// ================== HELP REQUESTS ==================

export const helpRequests = sqliteTable("help_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterId: integer("requester_id").notNull(),
  helperId: integer("helper_id").notNull(),
  status: text("status").default("pending"),
  timestamp: integer("timestamp").default(Date.now()),
});


/* ======================================================
   RELATIONS
====================================================== */

export const employeesRelations = relations(employees, ({ many }) => ({
  tasks: many(tasks),
  stressLogs: many(stressLogs),
  sentMessages: many(messages),          // ✅ FIX: was "messages" — renamed to avoid conflict
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(employees, {
    fields: [tasks.assignedToId],
    references: [employees.id],
  }),
}));

export const dutyLogsRelations = relations(dutyLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [dutyLogs.taskId],
    references: [tasks.id],
  }),
  fromEmployee: one(employees, {
    fields: [dutyLogs.fromEmployeeId],
    references: [employees.id],
  }),
  toEmployee: one(employees, {
    fields: [dutyLogs.toEmployeeId],
    references: [employees.id],
  }),
}));

// ✅ FIX: messagesRelations was completely missing — drizzle query.messages.findMany would fail
export const messagesRelations = relations(messages, ({ one }) => ({
  helpRequest: one(helpRequests, {
    fields: [messages.helpRequestId],
    references: [helpRequests.id],
  }),
  sender: one(employees, {
    fields: [messages.senderId],
    references: [employees.id],
  }),
}));

export const helpRequestsRelations = relations(helpRequests, ({ one, many }) => ({
  requester: one(employees, {
    fields: [helpRequests.requesterId],
    references: [employees.id],
  }),
  helper: one(employees, {
    fields: [helpRequests.helperId],
    references: [employees.id],
  }),
  // ✅ FIX: Added messages relation so helpRequest.messages works in queries
  messages: many(messages),
}));


/* ======================================================
   ZOD INSERT SCHEMAS
====================================================== */

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  currentStress: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertStressLogSchema = createInsertSchema(stressLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  timestamp: true,
  readStatus: true,
});

export const insertHelpRequestSchema = createInsertSchema(helpRequests).omit({
  id: true,
  timestamp: true,
});


/* ======================================================
   TYPES
====================================================== */

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type StressLog = typeof stressLogs.$inferSelect;
export type InsertStressLog = z.infer<typeof insertStressLogSchema>;

export type DutyLog = typeof dutyLogs.$inferSelect;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;