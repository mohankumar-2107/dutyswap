import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { employees, tasks } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { role, username, password, employeeId } = api.auth.login.input.parse(req.body);

      if (role === 'admin') {
        if (username === 'admin' && password === 'admin123') {
           let admin = await storage.getEmployeeByUsername('admin');
           if (!admin) {
             admin = await storage.createEmployee({
               name: 'System Admin',
               role: 'admin',
               username: 'admin',
               password: 'admin123'
             });
           }
           return res.json(admin);
        } else {
           return res.status(401).json({ message: 'Invalid admin credentials' });
        }
      } else {
        if (!employeeId) return res.status(400).json({ message: 'Employee ID required' });
        const employee = await storage.getEmployee(employeeId);
        if (!employee) return res.status(401).json({ message: 'Employee not found' });
        return res.json(employee);
      }
    } catch (err) {
       res.status(400).json({ message: 'Invalid request' });
    }
  });
  
  app.post(api.auth.logout.path, (req, res) => {
      res.json({ message: 'Logged out' });
  });

  app.get(api.auth.me.path, async (req, res) => {
    const employeeId = req.headers['x-employee-id'];
    
    if (employeeId && !isNaN(Number(employeeId))) {
      const user = await storage.getEmployee(Number(employeeId));
      if (user) return res.json(user);
    }

    // Check query params as well for redirects
    const queryId = req.query.employeeId;
    if (queryId && !isNaN(Number(queryId))) {
      const user = await storage.getEmployee(Number(queryId));
      if (user) return res.json(user);
    }

    res.json(null);
  });

  // === EMPLOYEES ===
  app.get(api.employees.list.path, async (req, res) => {
    const list = await storage.getEmployees();
    const today = new Date().toISOString().split('T')[0];
    
    // Add update status for each employee
    const enriched = await Promise.all(list.map(async emp => {
      const logs = await storage.getStressLogs(emp.id);
      const updatedToday = logs.some(l => l.date === today);
      return { ...emp, updatedToday };
    }));
    
    res.json(enriched);
  });

  app.post(api.employees.create.path, async (req, res) => {
    try {
      const input = api.employees.create.input.parse(req.body);
      const employee = await storage.createEmployee(input);
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  app.get(api.employees.get.path, async (req, res) => {
      const id = Number(req.params.id);
      const employee = await storage.getEmployee(id);
      if (!employee) return res.status(404).json({ message: 'Not found' });
      
      const logs = await storage.getStressLogs(id);
      res.json({ ...employee, stressLogs: logs });
  });

  // === TASKS ===
  app.get(api.tasks.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const tasks = await storage.getTasks(employeeId);
    res.json(tasks);
  });

app.post(api.tasks.create.path, async (req, res) => {
  try {

    const input = api.tasks.create.input.parse(req.body);

    const task = await storage.createTask(input);

    // ensure assigned employee exists
    if (!input.assignedToId) {
      return res.status(400).json({ message: "Task must have an assignee" });
    }

    const employee = await storage.getEmployee(input.assignedToId);

    // 🔹 AI check after assigning task
    if (employee && (employee.currentStress ?? 0) >= 4) {

      const pendingTasks = await storage.getPendingTasksForEmployee(employee.id);

      if (pendingTasks.length > 1) {

        const candidates = await storage.getLowStressEmployees(employee.id);

        if (candidates.length > 0) {

          const extraTasks = pendingTasks.slice(1);

          for (const t of extraTasks) {

            const target = candidates[0];

            await storage.reassignTask(t.id, target.id);

            await storage.logDutyReallocation(
              t.id,
              employee.id,
              target.id,
              "AI Auto-Reallocation (Task Assigned)"
            );

          }

        }

      }

    }

    res.status(201).json(task);

  } catch (err) {
    res.status(400).json({ message: "Validation error" });
  }
});

  // === STRESS & AI CHAT LOGIC ===
// === STRESS & AI CHAT LOGIC ===
app.post("/api/stress", async (req, res) => {
  try {
    const { employeeId, totalScore, answers } = req.body;

    if (!employeeId || typeof employeeId !== "number") {
      return res.status(400).json({ message: "Invalid employeeId" });
    }

    if (!Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({ message: "Answers must contain 10 values" });
    }

    const rawScore =
      Number(totalScore) || answers.reduce((a: number, b: number) => a + b, 0);

    // === STRESS CLASSIFICATION ===
    let calculatedLevel = 1;

    if (rawScore >= 26) calculatedLevel = 5;
    else if (rawScore >= 16) calculatedLevel = 3;
    else calculatedLevel = 1;

    console.log("Stress submission:", {
      employeeId,
      rawScore,
      answers,
      calculatedLevel,
    });

    // === SAVE STRESS LOG ===
    const log = await storage.logStress({
      employeeId,
      totalScore: rawScore,
      answers: JSON.stringify(answers),
      stressLevel: calculatedLevel,
    });

    // === UPDATE EMPLOYEE STRESS ===
    await storage.updateEmployeeStress(employeeId, calculatedLevel);

    let reallocation = false;
    let message = `Wellness check-in completed. Stress level ${
      calculatedLevel === 1
        ? "Low"
        : calculatedLevel === 3
        ? "Medium"
        : "High"
    }`;

    // =============================
    // === AI TASK REALLOCATION ===
    // =============================
    if (calculatedLevel >= 4) {
      console.log("AI REALLOCATION TRIGGERED");

      const pendingTasks = await storage.getPendingTasksForEmployee(employeeId);

      console.log("Employee pending tasks:", pendingTasks.length);

      if (pendingTasks.length >=1) {
        const candidates = await storage.getLowStressEmployees(employeeId);

        console.log("Available candidates:", candidates.length);

        if (candidates.length > 0) {

          const candidatesWithLoad = await Promise.all(
            candidates.map(async (c) => {
              const tasks = await storage.getPendingTasksForEmployee(c.id);
              return {
                employee: c,
                taskCount: tasks.length,
              };
            })
          );

          // === Greedy sorting ===
          candidatesWithLoad.sort((a, b) => {
            const stressDiff =
              (a.employee.currentStress ?? 0) -
              (b.employee.currentStress ?? 0);

            if (stressDiff !== 0) return stressDiff;

            return a.taskCount - b.taskCount;
          });

          const extraTasks = pendingTasks.slice(1);

          for (let i = 0; i < extraTasks.length; i++) {
            const task = extraTasks[i];

            const target =
              candidatesWithLoad[i % candidatesWithLoad.length].employee;

            console.log(
              `Reassigning task ${task.id} from ${employeeId} to ${target.id}`
            );

            await storage.reassignTask(task.id, target.id);

            await storage.logDutyReallocation(
              task.id,
              employeeId,
              target.id,
              `AI Auto-Reallocation (Stress Level ${calculatedLevel})`
            );
          }

          reallocation = true;

          message = `${extraTasks.length} tasks automatically redistributed due to high stress.`;
        }
      }
    }

    res.json({
      success: true,
      log,
      reallocation,
      message,
    });
  } catch (err) {
    console.error("Stress API error:", err);
    res
      .status(500)
      .json({ message: "Server error processing stress assessment" });
  }
});
  // === HELP REQUESTS ===
  app.get("/api/help-requests", async (req, res) => {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const list = await storage.getHelpRequests(Number(employeeId));
    res.json(list);
  });

  app.post("/api/help-requests", async (req, res) => {
    try {
      const employeeId = req.headers['x-employee-id'];
      if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
      const { helperId } = req.body;
      
      const requester = await storage.getEmployee(Number(employeeId));
      if (!requester) return res.status(404).json({ message: 'Requester not found' });

      const helpReq = await storage.createHelpRequest({
        requesterId: requester.id,
        helperId: Number(helperId),
        status: "pending"
      });

      await storage.createNotification({
        employeeId: Number(helperId),
        message: `${requester.name} has requested your assistance.`
      });

      res.status(201).json(helpReq);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.patch("/api/help-requests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body; // 'accepted' | 'rejected'
      const employeeId = req.headers['x-employee-id'];
      
      const helper = await storage.getEmployee(Number(employeeId));
      if (!helper) return res.status(401).json({ message: 'Unauthorized' });

      const updated = await storage.updateHelpRequestStatus(id, status);
      
      const msg = status === 'accepted' 
        ? `${helper.name} has accepted your help request.` 
        : `${helper.name} declined your help request.`;

      await storage.createNotification({
        employeeId: updated.requesterId,
        message: msg
      });

      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.json([]);
    const list = await storage.getNotifications(Number(employeeId));
    res.json(list);
  });

  app.get(api.stress.history.path, async (req, res) => {
      const history = await storage.getStressLogs(Number(req.params.employeeId));
      res.json(history);
  });

  // === ADMIN ===
  app.get(api.admin.stats.path, async (req, res) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get(api.admin.dutyLogs.path, async (req, res) => {
      const logs = await storage.getDutyLogs();
      res.json(logs);
  });

  // === MESSAGES ===
  app.post(api.messages.create.path, async (req, res) => {
      const input = api.messages.create.input.parse(req.body);
      const message = await storage.createMessage(input);
      res.status(201).json(message);
  });

  app.get(api.messages.list.path, async (req, res) => {
      const msgs = await storage.getMessages();
      res.json(msgs);
  });

  await seedDatabase();

  return httpServer;
}
async function seedDatabase() {
  const employeesList = await storage.getEmployees();

  if (employeesList.length === 0) {
    console.log("Seeding database...");

    await storage.createEmployee({
      name: 'System Admin',
      role: 'admin',
      username: 'admin',
      password: 'admin123'
    });

    const emp1 = await storage.createEmployee({
      name: 'Alice Johnson',
      role: 'employee'
    });

    const emp2 = await storage.createEmployee({
      name: 'Bob Smith',
      role: 'employee'
    });

    const emp3 = await storage.createEmployee({
      name: 'Charlie Brown',
      role: 'employee'
    });

    await storage.createTask({
      title: 'Complete Q1 Report',
      assignedToId: emp1.id,
      priority: 'High'
    });

    await storage.createTask({
      title: 'Update Website Assets',
      assignedToId: emp2.id,
      priority: 'Medium'
    });

    await storage.createTask({
      title: 'Client Meeting Prep',
      assignedToId: emp2.id,
      priority: 'High'
    });

    await storage.createTask({
      title: 'Fix Login Bug',
      assignedToId: emp3.id,
      priority: 'Low'
    });

    console.log("Seeding complete.");
  }
}