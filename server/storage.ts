
import { db } from "./db";
import {
  employees, tasks, stressLogs, dutyLogs, messages,
  type Employee, type InsertEmployee,
  type Task, type InsertTask,
  type StressLog, type InsertStressLog,
  type DutyLog,
  type Message, type InsertMessage
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByUsername(username: string): Promise<Employee | undefined>; // For admin
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployeeStress(id: number, stress: number): Promise<Employee>;
  getLowStressEmployees(excludeId: number): Promise<Employee[]>;

  // Tasks
  getTasks(employeeId?: number): Promise<(Task & { assignee: Employee | null })[]>;
  getPendingTasksForEmployee(employeeId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, status: string): Promise<Task>;
  reassignTask(taskId: number, newAssigneeId: number): Promise<Task>;

  // Stress Logs
  logStress(log: InsertStressLog): Promise<StressLog>;
  getStressLogs(employeeId: number): Promise<StressLog[]>;

  // Duty Logs
  logDutyReallocation(taskId: number, fromId: number, toId: number, reason?: string): Promise<DutyLog>;
  getDutyLogs(): Promise<(DutyLog & { task: Task | null, fromEmployee: Employee | null, toEmployee: Employee | null })[]>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(): Promise<(Message & { employee: Employee | null })[]>;

  // Stats
  getAdminStats(): Promise<{
    totalEmployees: number;
    lowStress: number;
    mediumStress: number;
    highStress: number;
    reassignedTasks: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Employees
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUsername(username: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.username, username));
    return employee;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(insertEmployee).returning();
    return employee;
  }

  async updateEmployeeStress(id: number, stress: number): Promise<Employee> {
    const [updated] = await db
      .update(employees)
      .set({ currentStress: stress })
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async getLowStressEmployees(excludeId: number): Promise<Employee[]> {
    // Find employees with stress <= 2
    return await db.select().from(employees).where(and(
        sql`${employees.currentStress} <= 2`,
        sql`${employees.id} != ${excludeId}`,
        eq(employees.role, 'employee')
    ));
  }

  // Tasks
  async getTasks(employeeId?: number): Promise<(Task & { assignee: Employee | null })[]> {
    const query = db.select({
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
      query.where(eq(tasks.assignedToId, employeeId));
    }

    return await query;
  }

  async getPendingTasksForEmployee(employeeId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(and(
        eq(tasks.assignedToId, employeeId),
        eq(tasks.status, 'Pending')
    ));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTaskStatus(id: number, status: string): Promise<Task> {
    const [updated] = await db.update(tasks).set({ status }).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async reassignTask(taskId: number, newAssigneeId: number): Promise<Task> {
    const [updated] = await db.update(tasks).set({ assignedToId: newAssigneeId }).where(eq(tasks.id, taskId)).returning();
    return updated;
  }

  // Stress Logs
  async logStress(insertLog: InsertStressLog): Promise<StressLog> {
    const [log] = await db.insert(stressLogs).values(insertLog).returning();
    return log;
  }

  async getStressLogs(employeeId: number): Promise<StressLog[]> {
    return await db.select().from(stressLogs).where(eq(stressLogs.employeeId, employeeId)).orderBy(desc(stressLogs.loggedAt));
  }

  // Duty Logs
  async logDutyReallocation(taskId: number, fromId: number, toId: number, reason: string): Promise<DutyLog> {
    const [log] = await db.insert(dutyLogs).values({
        taskId,
        fromEmployeeId: fromId,
        toEmployeeId: toId,
        reason
    }).returning();
    return log;
  }

  async getDutyLogs(): Promise<(DutyLog & { task: Task | null, fromEmployee: Employee | null, toEmployee: Employee | null })[]> {
    // Drizzle relation query or joins
    // Doing manual joins for type safety relative to interface return
    const logs = await db.select({
        id: dutyLogs.id,
        taskId: dutyLogs.taskId,
        fromEmployeeId: dutyLogs.fromEmployeeId,
        toEmployeeId: dutyLogs.toEmployeeId,
        reallocationDate: dutyLogs.reallocationDate,
        reason: dutyLogs.reason,
        task: tasks,
        fromEmployee: {
            id: employees.id,
            name: employees.name,
            role: employees.role,
            currentStress: employees.currentStress,
            username: employees.username,
            password: employees.password
        },
        // We need an alias for the second join to employees
    }).from(dutyLogs)
      .leftJoin(tasks, eq(dutyLogs.taskId, tasks.id))
      .leftJoin(employees, eq(dutyLogs.fromEmployeeId, employees.id));

    // To get 'toEmployee', we need a separate query or an alias which is harder in simple query builder without 'aliasedTable'
    // For simplicity in this demo, let's fetch 'toEmployee' separately or use the Relation API if we had setup exact return types.
    // Actually, let's just use the query builder with the relational API which is cleaner:
    return await db.query.dutyLogs.findMany({
        with: {
            task: true,
            fromEmployee: true,
            toEmployee: true
        },
        orderBy: desc(dutyLogs.reallocationDate)
    });
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(): Promise<(Message & { employee: Employee | null })[]> {
    return await db.query.messages.findMany({
        with: { employee: true },
        orderBy: desc(messages.sentAt)
    });
  }

  // Stats
  async getAdminStats(): Promise<{
    totalEmployees: number;
    lowStress: number;
    mediumStress: number;
    highStress: number;
    reassignedTasks: number;
  }> {
    const allEmployees = await db.select().from(employees);
    const low = allEmployees.filter(e => (e.currentStress || 0) <= 2 && e.role === 'employee').length;
    const medium = allEmployees.filter(e => (e.currentStress || 0) === 3 && e.role === 'employee').length;
    const high = allEmployees.filter(e => (e.currentStress || 0) >= 4 && e.role === 'employee').length;
    
    // Count only employees, not admin
    const total = allEmployees.filter(e => e.role === 'employee').length;
    
    const logs = await db.select().from(dutyLogs);
    
    return {
        totalEmployees: total,
        lowStress: low,
        mediumStress: medium,
        highStress: high,
        reassignedTasks: logs.length
    };
  }
}

export const storage = new DatabaseStorage();
