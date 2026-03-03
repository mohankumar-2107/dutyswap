
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
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: 'Validation error' });
    }
  });

  app.patch(api.tasks.complete.path, async (req, res) => {
      const id = Number(req.params.id);
      const updated = await storage.updateTaskStatus(id, 'Completed');
      if (!updated) return res.status(404).json({ message: 'Task not found' });
      res.json(updated);
  });

  app.post(api.tasks.reassign.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { newAssigneeId } = api.tasks.reassign.input.parse(req.body);
      
      const task = await storage.getTask(id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      
      const oldAssigneeId = task.assignedToId;
      const updatedTask = await storage.reassignTask(id, newAssigneeId);
      
      if (oldAssigneeId) {
        await storage.logDutyReallocation(id, oldAssigneeId, newAssigneeId, "Manual Admin Reallocation");
      }
      
      res.json(updatedTask);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  // === STRESS & AI CHAT LOGIC ===
  app.post("/api/stress", async (req, res) => {
    try {
      const input = req.body;
      const rawScore = input.totalScore || 0;
      
      // Revert to 1-5 scale: 10-15 (1), 16-25 (3), 26-40 (5)
      let calculatedLevel = 1;
      if (rawScore >= 26) calculatedLevel = 5;
      else if (rawScore >= 16) calculatedLevel = 3;

      const logData = {
        employeeId: input.employeeId,
        totalScore: rawScore,
        answers: input.answers,
        stressLevel: calculatedLevel,
      };
      
      const log = await storage.logStress(logData);
      const employee = await storage.updateEmployeeStress(input.employeeId, calculatedLevel);
      
      let reallocation = false;
      let message = `Wellness check-in completed. Your stress level is ${calculatedLevel === 1 ? 'Low' : calculatedLevel === 3 ? 'Medium' : 'High'}.`;

      // AI REALLOCATION LOGIC (Greedy Load Balancing)
      if (calculatedLevel >= 4) {
          const pendingTasks = await storage.getPendingTasksForEmployee(input.employeeId);
          console.log(`[AI] Checking reallocation for ${employee.name}. Pending tasks: ${pendingTasks.length}`);
          
          if (pendingTasks.length > 1) {
              const candidates = await storage.getLowStressEmployees(input.employeeId);
              console.log(`[AI] Found ${candidates.length} potential candidates.`);
              
              if (candidates.length > 0) {
                  // Greedy load balancing: Sort by (currentStress ASC, taskCount ASC)
                  const candidatesWithLoad = await Promise.all(candidates.map(async c => {
                    const tasks = await storage.getPendingTasksForEmployee(c.id);
                    return { employee: c, taskCount: tasks.length };
                  }));
                  
                  candidatesWithLoad.sort((a, b) => {
                    if (a.employee.currentStress !== b.employee.currentStress) {
                      return (a.employee.currentStress || 0) - (b.employee.currentStress || 0);
                    }
                    return a.taskCount - b.taskCount;
                  });
                  
                  const targetEmployee = candidatesWithLoad[0].employee;
                  const extraTasks = pendingTasks.slice(1);
                  console.log(`[AI] Reallocating ${extraTasks.length} tasks to ${targetEmployee.name}`);
                  
                  for (const taskToMove of extraTasks) {
                    await storage.reassignTask(taskToMove.id, targetEmployee.id);
                    await storage.logDutyReallocation(taskToMove.id, input.employeeId, targetEmployee.id, `AI Auto-Reallocation (Level: ${calculatedLevel})`);
                    
                    await storage.createNotification({
                      employeeId: input.employeeId,
                      message: `Your task "${taskToMove.title}" has been reassigned to ${targetEmployee.name} due to high stress workload balancing.`
                    });
                    
                    await storage.createNotification({
                      employeeId: targetEmployee.id,
                      message: `You have received an additional task "${taskToMove.title}" reassigned from ${employee.name}.`
                    });
                  }
                  
                  reallocation = true;
                  message = `High stress detected. ${extraTasks.length} extra tasks reallocated to ${targetEmployee.name}. You kept 1 task.`;
              }
          }
      }

      res.json({ log, reallocation, message });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: 'Validation error' });
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
        await storage.createEmployee({ name: 'System Admin', role: 'admin', username: 'admin', password: 'admin123' });
        
        const emp1 = await storage.createEmployee({ name: 'Alice Johnson', role: 'employee', currentStress: 1 });
        const emp2 = await storage.createEmployee({ name: 'Bob Smith', role: 'employee', currentStress: 1 });
        const emp3 = await storage.createEmployee({ name: 'Charlie Brown', role: 'employee', currentStress: 1 });
        
        await storage.createTask({ title: 'Complete Q1 Report', assignedToId: emp1.id, priority: 'High', status: 'Pending' });
        await storage.createTask({ title: 'Update Website Assets', assignedToId: emp2.id, priority: 'Medium', status: 'Pending' });
        await storage.createTask({ title: 'Client Meeting Prep', assignedToId: emp2.id, priority: 'High', status: 'Pending' });
        await storage.createTask({ title: 'Fix Login Bug', assignedToId: emp3.id, priority: 'Low', status: 'Pending' });

        console.log("Seeding complete.");
    }
}
