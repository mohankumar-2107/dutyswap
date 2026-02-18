import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertTask } from "@shared/routes";

export function useTasks(employeeId?: number) {
  return useQuery({
    queryKey: [api.tasks.list.path, employeeId],
    queryFn: async () => {
      const url = employeeId 
        ? `${api.tasks.list.path}?employeeId=${employeeId}` 
        : api.tasks.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await fetch(api.tasks.create.path, {
        method: api.tasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const url = buildUrl(api.tasks.complete.path, { id: taskId });
      const res = await fetch(url, {
        method: api.tasks.complete.method,
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}
