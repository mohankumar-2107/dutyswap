import { z } from "zod";
import { insertEmployeeSchema, insertTaskSchema, insertStressLogSchema, insertMessageSchema } from "./schema";

/**
 * Builds a URL by replacing path parameters (e.g., :id) with actual values.
 */
export function buildUrl(path: string, params: Record<string, string | number>) {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, value.toString());
  }
  return url;
}

export const api = {
  auth: {
    login: {
      path: "/api/auth/login",
      method: "POST",
      input: z.object({
        role: z.enum(['admin', 'employee']),
        username: z.string().optional(),
        password: z.string().optional(),
        employeeId: z.number().optional(),
      })
    },
    logout: { path: "/api/auth/logout", method: "POST" },
    me: { path: "/api/auth/me", method: "GET" }
  },
  employees: {
    list: { path: "/api/employees", method: "GET" },
    create: { 
      path: "/api/employees",
      method: "POST",
      input: insertEmployeeSchema
    },
    get: { path: "/api/employees/:id", method: "GET" }
  },
  tasks: {
    list: { path: "/api/tasks", method: "GET" },
    create: {
      path: "/api/tasks",
      method: "POST",
      input: insertTaskSchema
    },
    complete: { path: "/api/tasks/:id/complete", method: "PATCH" },
    reassign: {
      path: "/api/tasks/:id/reassign",
      method: "POST",
      input: z.object({ newAssigneeId: z.number() })
    }
  },
  stress: {
    log: {
      path: "/api/stress",
      method: "POST",
      input: z.object({
        employeeId: z.number(),
        totalScore: z.number(),
        answers: z.array(z.number())
      })
    },
    history: { path: "/api/stress/history/:employeeId", method: "GET" }
  },
  admin: {
    stats: { path: "/api/admin/stats", method: "GET" },
    dutyLogs: { path: "/api/admin/duty_logs", method: "GET" }
  },
  messages: {
    create: {
      path: "/api/messages",
      method: "POST",
      input: insertMessageSchema
    },
    list: { path: "/api/messages", method: "GET" }
  }
};

export const errorSchemas = {
  badRequest: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
};
