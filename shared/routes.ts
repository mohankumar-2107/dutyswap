
import { z } from 'zod';
import { insertEmployeeSchema, insertTaskSchema, insertStressLogSchema, insertMessageSchema, employees, tasks, stressLogs, dutyLogs, messages } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string().optional(), // For admin
        password: z.string().optional(), // For admin
        employeeId: z.number().optional(), // For employee demo login
        role: z.enum(['admin', 'employee']),
      }),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
        method: 'GET' as const,
        path: '/api/auth/me' as const,
        responses: {
            200: z.custom<typeof employees.$inferSelect>(),
            401: z.null()
        }
    }
  },
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees' as const,
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees' as const,
      input: insertEmployeeSchema,
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:id' as const,
      responses: {
        200: z.custom<typeof employees.$inferSelect & { stressLogs: typeof stressLogs.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks' as const,
      input: z.object({
        employeeId: z.string().optional(), // Filter by assignee
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect & { assignee: typeof employees.$inferSelect | null }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks' as const,
      input: insertTaskSchema,
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    complete: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id/complete' as const,
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  stress: {
    log: {
      method: 'POST' as const,
      path: '/api/stress' as const,
      input: insertStressLogSchema,
      responses: {
        200: z.object({
          log: z.custom<typeof stressLogs.$inferSelect>(),
          reallocation: z.boolean(), // True if tasks were reallocated
          message: z.string().optional()
        }),
        400: errorSchemas.validation,
      },
    },
    history: {
        method: 'GET' as const,
        path: '/api/stress/history/:employeeId' as const,
        responses: {
            200: z.array(z.custom<typeof stressLogs.$inferSelect>())
        }
    }
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats' as const,
      responses: {
        200: z.object({
          totalEmployees: z.number(),
          lowStress: z.number(),
          mediumStress: z.number(),
          highStress: z.number(),
          reassignedTasks: z.number(),
        }),
      },
    },
    dutyLogs: {
      method: 'GET' as const,
      path: '/api/admin/duty-logs' as const,
      responses: {
        200: z.array(z.custom<typeof dutyLogs.$inferSelect & { 
            task: typeof tasks.$inferSelect | null,
            fromEmployee: typeof employees.$inferSelect | null,
            toEmployee: typeof employees.$inferSelect | null
        }>()),
      },
    },
  },
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/messages' as const,
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/messages' as const,
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect & { employee: typeof employees.$inferSelect | null }>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
