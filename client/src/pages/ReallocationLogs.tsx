import { useDutyLogs } from "@/hooks/use-stress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ReallocationLogs() {
  const { data: logs, isLoading } = useDutyLogs();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-display text-gray-900">Duty Reallocation Log</h1>
        <p className="text-muted-foreground">History of automated task transfers due to high stress levels.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Recent Events
          </CardTitle>
          <CardDescription>System-triggered load balancing events.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No reallocation events recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                      {format(new Date(log.reallocationDate), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{log.task?.title || "Unknown Task"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                          {log.fromEmployee?.name || "Unknown"}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          {log.toEmployee?.name || "Unknown"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
