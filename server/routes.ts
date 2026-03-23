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

  // ✅ Edit employee name/role
  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, role } = req.body;
      const updated = await storage.updateEmployee(id, { name, role });
      if (!updated) return res.status(404).json({ message: "Employee not found" });
      queryClient.invalidateQueries?.({ queryKey: ["employees"] });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // ✅ Delete employee
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteEmployee(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
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

      if (!input.assignedToId) {
        return res.status(400).json({ message: "Task must have an assignee" });
      }

      const employee = await storage.getEmployee(input.assignedToId);

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

  // ✅ FIX: MISSING REASSIGN ROUTE — this is why onError was firing despite 200
  app.post(api.tasks.reassign.path, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const { newAssigneeId } = req.body;

      if (!taskId || isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      if (!newAssigneeId || isNaN(Number(newAssigneeId))) {
        return res.status(400).json({ message: "Invalid newAssigneeId" });
      }

      // Get the task to find original assignee for the log
      const allTasks = await storage.getTasks();
      const task = allTasks.find(t => t.id === taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // ✅ FIX: originalAssigneeId is number | null — guard against null before passing to logDutyReallocation
      const originalAssigneeId = task.assignedToId ?? 0;

      // Reassign the task
      const updated = await storage.reassignTask(taskId, Number(newAssigneeId));

      // Log the manual reallocation
      await storage.logDutyReallocation(
        taskId,
        originalAssigneeId,
        Number(newAssigneeId),
        "Manual Reallocation (Admin)"
      );

      res.json({ success: true, task: updated });
    } catch (err) {
      console.error("Reassign error:", err);
      res.status(500).json({ message: "Failed to reassign task" });
    }
  });

  // ✅ Complete task route — marks task as Completed
  app.post(api.tasks.complete.path, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      if (!taskId || isNaN(taskId)) return res.status(400).json({ message: "Invalid task ID" });
      const updated = await storage.updateTaskStatus(taskId, "Completed");
      if (!updated) return res.status(404).json({ message: "Task not found" });
      res.json(updated);
    } catch (err) {
      console.error("Complete task error:", err);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // ✅ Explicit hardcoded path as fallback — guarantees /api/tasks/:id/complete always works
  app.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      if (!taskId || isNaN(taskId)) return res.status(400).json({ message: "Invalid task ID" });
      const updated = await storage.updateTaskStatus(taskId, "Completed");
      if (!updated) return res.status(404).json({ message: "Task not found" });
      res.json(updated);
    } catch (err) {
      console.error("Complete task error:", err);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

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

      let calculatedLevel = 1;
      if (rawScore >= 26) calculatedLevel = 5;
      else if (rawScore >= 16) calculatedLevel = 3;
      else calculatedLevel = 1;

      console.log("Stress submission:", { employeeId, rawScore, answers, calculatedLevel });

      const log = await storage.logStress({
        employeeId,
        totalScore: rawScore,
        answers: JSON.stringify(answers),
        stressLevel: calculatedLevel,
      });

      await storage.updateEmployeeStress(employeeId, calculatedLevel);

      let reallocation = false;
      let message = `Wellness check-in completed. Stress level ${
        calculatedLevel === 1 ? "Low" : calculatedLevel === 3 ? "Medium" : "High"
      }`;

      if (calculatedLevel >= 4) {
        console.log("AI REALLOCATION TRIGGERED");
        const pendingTasks = await storage.getPendingTasksForEmployee(employeeId);
        console.log("Employee pending tasks:", pendingTasks.length);

        if (pendingTasks.length >= 1) {
          const candidates = await storage.getLowStressEmployees(employeeId);
          console.log("Available candidates:", candidates.length);

          if (candidates.length > 0) {
            const candidatesWithLoad = await Promise.all(
              candidates.map(async (c) => {
                const tasks = await storage.getPendingTasksForEmployee(c.id);
                return { employee: c, taskCount: tasks.length };
              })
            );

            candidatesWithLoad.sort((a, b) => {
              const stressDiff = (a.employee.currentStress ?? 0) - (b.employee.currentStress ?? 0);
              if (stressDiff !== 0) return stressDiff;
              return a.taskCount - b.taskCount;
            });

            const extraTasks = pendingTasks.slice(1);

            for (let i = 0; i < extraTasks.length; i++) {
              const task = extraTasks[i];
              const target = candidatesWithLoad[i % candidatesWithLoad.length].employee;
              console.log(`Reassigning task ${task.id} from ${employeeId} to ${target.id}`);
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

      res.json({ success: true, log, reallocation, message });
    } catch (err) {
      console.error("Stress API error:", err);
      res.status(500).json({ message: "Server error processing stress assessment" });
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
      const { status } = req.body;
      const employeeId = req.headers["x-employee-id"];

      if (!employeeId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const helper = await storage.getEmployee(Number(employeeId));
      if (!helper) {
        return res.status(404).json({ message: "Helper not found" });
      }

      const updated = await storage.updateHelpRequestStatus(id, status);

      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }

      const message =
        status === "accepted"
          ? `${helper.name} accepted your help request.`
          : `${helper.name} declined your help request.`;

      await storage.createNotification({
        employeeId: updated.requesterId,
        message,
      });

      res.json(updated);
    } catch (err) {
      console.error("Help request update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.json([]);
    const list = await storage.getNotifications(Number(employeeId));
    res.json(list);
  });

  // ✅ Allow admin to push a notification directly to an employee
  app.post("/api/notifications", async (req, res) => {
    try {
      const { employeeId, message } = req.body;
      if (!employeeId || !message) {
        return res.status(400).json({ message: "employeeId and message are required" });
      }
      const notif = await storage.createNotification({ employeeId, message });
      res.status(201).json(notif);
    } catch (err) {
      console.error("Notification error:", err);
      res.status(500).json({ message: "Failed to send notification" });
    }
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
  app.post("/api/messages", async (req, res) => {
    try {
      const { helpRequestId, senderId, content } = req.body;

      if (!helpRequestId || !senderId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const message = await storage.createMessage({ helpRequestId, senderId, content });
      res.status(201).json(message);
    } catch (err) {
      console.error("Send message error:", err);
      res.status(500).json({ message: "Error sending message" });
    }
  });

  app.get("/api/messages/:helpRequestId", async (req, res) => {
    try {
      const helpRequestId = Number(req.params.helpRequestId);

      if (!helpRequestId) {
        return res.status(400).json({ message: "Invalid helpRequestId" });
      }

      const msgs = await storage.getMessagesByHelpRequest(helpRequestId);
      res.json(msgs);
    } catch (err) {
      console.error("Fetch messages error:", err);
      res.status(500).json({ message: "Error fetching messages" });
    }
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

    const emp1 = await storage.createEmployee({ name: 'Alice Johnson', role: 'employee' });
    const emp2 = await storage.createEmployee({ name: 'Bob Smith', role: 'employee' });
    const emp3 = await storage.createEmployee({ name: 'Charlie Brown', role: 'employee' });

    await storage.createTask({ title: 'Complete Q1 Report', assignedToId: emp1.id, priority: 'High' });
    await storage.createTask({ title: 'Update Website Assets', assignedToId: emp2.id, priority: 'Medium' });
    await storage.createTask({ title: 'Client Meeting Prep', assignedToId: emp2.id, priority: 'High' });
    await storage.createTask({ title: 'Fix Login Bug', assignedToId: emp3.id, priority: 'Low' });

    console.log("Seeding complete.");
  }
}