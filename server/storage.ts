import { db } from "./db";

import {
  employees,
  tasks,
  stressLogs,
  dutyLogs,
  messages,
  notifications,
  helpRequests,
  type Employee,
  type InsertEmployee,
  type Task,
  type InsertTask,
  type StressLog,
  type InsertStressLog,
  type DutyLog,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type HelpRequest,
  type InsertHelpRequest
} from "@shared/schema";

import { eq, desc, and, ne, or, lte } from "drizzle-orm";

export class DatabaseStorage {

  // =========================
  // EMPLOYEES
  // =========================

  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [row] = await db.select().from(employees).where(eq(employees.id, id));
    return row;
  }

  async getEmployeeByUsername(username: string): Promise<Employee | undefined> {
    const [row] = await db.select().from(employees).where(eq(employees.username, username));
    return row;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const [row] = await db.insert(employees).values(data).returning();
    return row;
  }

  async updateEmployeeStress(id: number, stress: number): Promise<Employee> {
    const [row] = await db
      .update(employees)
      .set({ currentStress: stress })
      .where(eq(employees.id, id))
      .returning();

    return row;
  }

  async getLowStressEmployees(excludeId: number): Promise<Employee[]> {
    return db
      .select()
      .from(employees)
      .where(
        and(
          ne(employees.id, excludeId),
          eq(employees.role, "employee"),
          lte(employees.currentStress, 3)
        )
      );
  }

  // =========================
  // TASKS
  // =========================

  async getTasks(employeeId?: number): Promise<(Task & { assignee: Employee | null })[]> {

    const baseQuery = db
      .select({
        id: tasks.id,
        title: tasks.title,
        assignedToId: tasks.assignedToId,
        priority: tasks.priority,
        status: tasks.status,
        createdAt: tasks.createdAt,
        assignee: employees
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id));

    if (employeeId) {
      return baseQuery.where(eq(tasks.assignedToId, employeeId));
    }

    return baseQuery;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
    return row;
  }

  async getPendingTasksForEmployee(employeeId: number): Promise<Task[]> {
    return db.select().from(tasks).where(
      and(
        eq(tasks.assignedToId, employeeId),
        eq(tasks.status, "Pending")
      )
    );
  }

  async createTask(data: InsertTask): Promise<Task> {

    // ensure default status
    const values = {
      ...data,
      status: "Pending"
    };

    const [row] = await db.insert(tasks).values(values).returning();

    return row;
  }

  async updateTaskStatus(id: number, status: string): Promise<Task> {

    const [row] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();

    return row;
  }

  async reassignTask(taskId: number, newAssigneeId: number): Promise<Task> {

    const [row] = await db
      .update(tasks)
      .set({ assignedToId: newAssigneeId })
      .where(eq(tasks.id, taskId))
      .returning();

    return row;
  }

  // =========================
  // STRESS
  // =========================

  async logStress(log: InsertStressLog): Promise<StressLog> {

    const values = {
      employeeId: log.employeeId,
      stressLevel: log.stressLevel,
      totalScore: log.totalScore,
      answers: typeof log.answers === "string"
        ? log.answers
        : JSON.stringify(log.answers),
      loggedAt: Date.now(),
      date: new Date().toISOString().split("T")[0]
    };

    const [row] = await db.insert(stressLogs).values(values).returning();

    return row;
  }

  async getStressLogs(employeeId: number): Promise<StressLog[]> {

    return db
      .select()
      .from(stressLogs)
      .where(eq(stressLogs.employeeId, employeeId))
      .orderBy(desc(stressLogs.loggedAt));

  }

  // =========================
  // DUTY LOGS
  // =========================

  async logDutyReallocation(
    taskId: number,
    fromId: number,
    toId: number,
    reason = "Manual Admin Reallocation"
  ): Promise<DutyLog> {

    const [row] = await db.insert(dutyLogs).values({
      taskId,
      fromEmployeeId: fromId,
      toEmployeeId: toId,
      reason,
      reallocationDate: Date.now()
    }).returning();

    return row;
  }

  async getDutyLogs() {

    return db.query.dutyLogs.findMany({
      with: {
        task: true,
        fromEmployee: true,
        toEmployee: true
      },
      orderBy: (logs, { desc }) => [desc(logs.reallocationDate)]
    }) as any;

  }

  // =========================
  // MESSAGES
  // =========================

  async createMessage(data: InsertMessage): Promise<Message> {

    const [row] = await db.insert(messages).values(data).returning();

    return row;

  }

  async getMessages() {

    return db.query.messages.findMany({
      with: { employee: true },
      orderBy: (msgs, { desc }) => [desc(msgs.sentAt)]
    });

  }

  // =========================
  // NOTIFICATIONS
  // =========================

  async createNotification(data: InsertNotification): Promise<Notification> {

    const [row] = await db.insert(notifications).values(data).returning();

    return row;

  }

  async getNotifications(employeeId: number): Promise<Notification[]> {

    return db
      .select()
      .from(notifications)
      .where(eq(notifications.employeeId, employeeId))
      .orderBy(desc(notifications.timestamp));

  }

  // =========================
  // HELP REQUESTS
  // =========================

  async createHelpRequest(req: InsertHelpRequest): Promise<HelpRequest> {

    const [row] = await db.insert(helpRequests).values(req).returning();

    return row;

  }

  async updateHelpRequestStatus(id: number, status: string): Promise<HelpRequest> {

    const [row] = await db
      .update(helpRequests)
      .set({ status })
      .where(eq(helpRequests.id, id))
      .returning();

    return row;

  }

  async getHelpRequests(employeeId: number) {

    return db.query.helpRequests.findMany({
      where: or(
        eq(helpRequests.requesterId, employeeId),
        eq(helpRequests.helperId, employeeId)
      ),
      with: {
        requester: true,
        helper: true
      },
      orderBy: (req, { desc }) => [desc(req.timestamp)]
    });

  }

  // =========================
  // ADMIN DASHBOARD
  // =========================

  async getAdminStats() {

    const all = await db.select().from(employees);

    const staff = all.filter(e => e.role === "employee");

    const low = staff.filter(e => (e.currentStress ?? 0) <= 2).length;
    const medium = staff.filter(e => (e.currentStress ?? 0) === 3).length;
    const high = staff.filter(e => (e.currentStress ?? 0) >= 4).length;

    const duty = await db.select().from(dutyLogs);

    return {
      totalEmployees: staff.length,
      lowStress: low,
      mediumStress: medium,
      highStress: high,
      reassignedTasks: duty.length
    };

  }

}

export const storage = new DatabaseStorage();