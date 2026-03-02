
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
    const employees = await storage.getEmployees();
    res.json(employees);
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
  app.post(api.stress.log.path, async (req, res) => {
    try {
      const input = api.stress.log.input.parse(req.body);
      
      let calculatedLevel = 1;
      const score = input.totalScore || 0;
      if (score > 25) {
        calculatedLevel = 5;
      } else if (score > 15) {
        calculatedLevel = 3;
      }

      const logData = {
        employeeId: input.employeeId,
        totalScore: input.totalScore,
        answers: input.answers,
        stressLevel: calculatedLevel,
      };
      
      console.log(`Logging stress data for employee ${input.employeeId}:`, logData);
      const log = await storage.logStress(logData);
      
      await storage.updateEmployeeStress(input.employeeId, calculatedLevel);
      
      let reallocation = false;
      let message = "Wellness check-in completed. Your stress level is " + (calculatedLevel === 1 ? "Low" : calculatedLevel === 3 ? "Medium" : "High") + ".";

      if (calculatedLevel === 5) {
          const pendingTasks = await storage.getPendingTasksForEmployee(input.employeeId);
          
          if (pendingTasks.length > 0) {
              const history = await storage.getStressLogs(input.employeeId);
              const today = new Date().toISOString().split('T')[0];
              const todayLogs = history.filter(l => l.date === today);
              const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
              const yesterdayLogs = history.filter(l => l.date === yesterday);

              const isHighYesterday = yesterdayLogs.some(l => l.stressLevel === 5);
              const isHighToday = todayLogs.some(l => l.stressLevel === 5);

              if (isHighYesterday && isHighToday) {
                  const candidates = await storage.getLowStressEmployees(input.employeeId);
                  
                  if (candidates.length > 0) {
                      const targetEmployee = candidates[0];
                      const taskToMove = pendingTasks[0];
                      
                      await storage.reassignTask(taskToMove.id, targetEmployee.id);
                      await storage.logDutyReallocation(taskToMove.id, input.employeeId, targetEmployee.id, `Persistent High Stress (Yesterday & Today) detected via Wellness Chat`);
                      
                      reallocation = true;
                      message = `Persistent high stress detected. Task "${taskToMove.title}" has been reassigned to ${targetEmployee.name} to support your wellness.`;
                  } else {
                      message = `High stress detected, but no available low-stress employees found. Please contact Admin.`;
                  }
              } else if (isHighToday) {
                  message = "High stress detected today. We will monitor your status. If it remains high tomorrow, we will automatically reallocate tasks.";
              }
          }
      }

      res.json({ log, reallocation, message });

    } catch (err) {
      console.error(err);
      res.status(400).json({ message: 'Validation error' });
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
