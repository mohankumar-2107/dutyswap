
import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'admin' | 'employee'
  currentStress: integer("current_stress").default(0),
  username: text("username").unique(),
  password: text("password"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  assignedToId: integer("assigned_to_id").references(() => employees.id),
  priority: text("priority").notNull(), // 'Low', 'Medium', 'High'
  status: text("status").notNull().default("Pending"), // 'Pending', 'Completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const stressLogs = pgTable("stress_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  stressLevel: integer("stress_level").notNull(), // 1-5 (legacy) or calculated from chat
  totalScore: integer("total_score"), // New: sum of 10 questions
  answers: jsonb("answers"), // New: store individual answers
  loggedAt: timestamp("logged_at").defaultNow(),
  date: date("date").defaultNow(),
});

export const dutyLogs = pgTable("duty_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  fromEmployeeId: integer("from_employee_id").references(() => employees.id),
  toEmployeeId: integer("to_employee_id").references(() => employees.id),
  reallocationDate: timestamp("reallocation_date").defaultNow(),
  reason: text("reason").default("High Stress Auto-Reallocation"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// === RELATIONS ===

export const employeesRelations = relations(employees, ({ many }) => ({
  tasks: many(tasks),
  stressLogs: many(stressLogs),
  messages: many(messages),
  reallocationsFrom: many(dutyLogs, { relationName: "reallocatedFrom" }),
  reallocationsTo: many(dutyLogs, { relationName: "reallocatedTo" }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(employees, {
    fields: [tasks.assignedToId],
    references: [employees.id],
  }),
  dutyLogs: many(dutyLogs),
}));

export const stressLogsRelations = relations(stressLogs, ({ one }) => ({
  employee: one(employees, {
    fields: [stressLogs.employeeId],
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
    relationName: "reallocatedFrom"
  }),
  toEmployee: one(employees, {
    fields: [dutyLogs.toEmployeeId],
    references: [employees.id],
    relationName: "reallocatedTo"
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  employee: one(employees, {
    fields: [messages.employeeId],
    references: [employees.id],
  }),
}));

// === ZOD SCHEMAS ===

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, currentStress: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, status: true });
export const insertStressLogSchema = createInsertSchema(stressLogs).omit({ id: true, loggedAt: true, date: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, sentAt: true, isRead: true });

// === TYPES ===

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type StressLog = typeof stressLogs.$inferSelect;
export type InsertStressLog = z.infer<typeof insertStressLogSchema>;

export type DutyLog = typeof dutyLogs.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  readStatus: boolean("read_status").default(false),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  employee: one(employees, {
    fields: [notifications.employeeId],
    references: [employees.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, timestamp: true, readStatus: true });
export const helpRequests = pgTable("help_requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => employees.id),
  helperId: integer("helper_id").notNull().references(() => employees.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  timestamp: timestamp("timestamp").defaultNow(),
});

export const helpRequestsRelations = relations(helpRequests, ({ one }) => ({
  requester: one(employees, {
    fields: [helpRequests.requesterId],
    references: [employees.id],
    relationName: "requestsSent",
  }),
  helper: one(employees, {
    fields: [helpRequests.helperId],
    references: [employees.id],
    relationName: "requestsReceived",
  }),
}));

export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof createInsertSchema(helpRequests).omit({ id: true, timestamp: true })>;
