import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertStressLog } from "@shared/schema";

export function useLogStress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertStressLog) => {
      const res = await fetch(api.stress.log.path, {
        method: api.stress.log.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log stress");
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: [api.employees.get.path] }); 
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
      // If reallocation happened, refresh tasks too
      if (data.reallocation) {
        queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.admin.dutyLogs.path] });
      }
    },
  });
}

export function useStressHistory(employeeId: number) {
  return useQuery({
    queryKey: [api.stress.history.path, employeeId],
    queryFn: async () => {
      const url = buildUrl(api.stress.history.path, { employeeId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch stress history");
      return await res.json();
    },
    enabled: !!employeeId,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: [api.admin.stats.path],
    queryFn: async () => {
      const res = await fetch(api.admin.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return await res.json();
    },
  });
}

export function useDutyLogs() {
  return useQuery({
    queryKey: [api.admin.dutyLogs.path],
    queryFn: async () => {
      const res = await fetch(api.admin.dutyLogs.path);
      if (!res.ok) throw new Error("Failed to fetch duty logs");
      return await res.json();
    },
  });
}
