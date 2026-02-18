import { useUser } from "@/hooks/use-auth";
import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { useStressHistory } from "@/hooks/use-stress";
import { StressBadge } from "@/components/StressBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AIWellnessChat } from "@/components/AIWellnessChat";

export default function EmployeeDashboard() {
  const { data: user } = useUser();
  const { data: tasks, isLoading: tasksLoading } = useTasks(user?.id);
  const { mutate: completeTask } = useCompleteTask();
  const { data: stressHistory } = useStressHistory(user?.id || 0);

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900">Welcome, {user.name}</h1>
          <p className="text-muted-foreground">Here's your wellness and workload overview.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-muted-foreground">Current Status</p>
          </div>
          <StressBadge level={user.currentStress} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: AI Wellness Chat & History */}
        <div className="space-y-6">
          <AIWellnessChat employeeId={user.id} />

          {/* Mini Chart */}
          <Card className="glass-panel border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Stress Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              {stressHistory && stressHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stressHistory.slice(-7)}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 6]} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => format(new Date(label), 'MMM d')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stressLevel" 
                      stroke="hsl(45, 93%, 47%)" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "white", strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No history data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Tasks */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-full flex flex-col">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle>My Tasks</CardTitle>
                <div className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  {tasks?.filter((t: any) => t.status === 'Pending').length || 0} Pending
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {tasksLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
              ) : tasks?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 opacity-20" />
                  </div>
                  <p>All caught up! No tasks assigned.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {tasks?.map((task: any) => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-5 flex items-start gap-4 hover:bg-white/40 transition-colors ${task.status === 'Completed' ? 'opacity-50' : ''}`}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`mt-0.5 rounded-full ${task.status === 'Completed' ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                          onClick={() => task.status !== 'Completed' && completeTask(task.id)}
                          disabled={task.status === 'Completed'}
                        >
                          {task.status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </Button>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className={`font-semibold text-lg ${task.status === 'Completed' ? 'line-through decoration-primary/50' : ''}`}>{task.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                              task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-green-50 text-green-600 border-green-100'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Assigned {format(new Date(task.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
