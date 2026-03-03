import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { useStressHistory } from "@/hooks/use-stress";
import { StressBadge } from "@/components/StressBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, Circle, Clock, TrendingUp, AlertCircle, LifeBuoy, Zap, Brain } from "lucide-react";
import { format, isToday } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function EmployeeDashboard() {
  const { data: user, refetch: refetchUser, isLoading: userLoading } = useUser();
  const { data: tasks, isLoading: tasksLoading } = useTasks(user?.id);
  const { mutate: completeTask } = useCompleteTask();
  const { data: stressHistory, refetch: refetchStress, isLoading: stressLoading } = useStressHistory(user?.id || 0);

  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user?.id
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stress/history", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });
    }
  }, [user?.id, queryClient]);

  const { data: helpRequests, isLoading: helpLoading } = useQuery<any[]>({
    queryKey: ["/api/help-requests"],
    enabled: !!user?.id,
    refetchInterval: 5000 // Poll for new help requests
  });

  const { data: eligibleHelpers } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    select: (emps) => emps.filter((e: any) => e.role === 'employee' && e.id !== user.id && (e.currentStress || 0) <= 3)
  });

  const helpRequestMutation = useMutation({
    mutationFn: async (helperId: number) => {
      return apiRequest("POST", "/api/help-requests", { helperId });
    },
    onSuccess: () => {
      toast({ title: "Request Sent", description: "Assistance request sent to peer." });
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });
    }
  });

  const respondHelpMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest("PATCH", `/api/help-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  const { toast } = useToast();

  const helpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/messages", {
        employeeId: user?.id,
        content: "🆘 EMERGENCY: I am feeling extremely overwhelmed and need immediate support."
      });
    },
    onSuccess: () => {
      toast({
        title: "Support Requested",
        description: "Your anonymous request for help has been sent to the Admin. Hang in there!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  });

  if (!user) return null;

  const updatedToday = stressHistory?.some(log => isToday(new Date(log.date || log.loggedAt || "")));
  const isBurnoutRisk = (user.currentStress || 0) >= 4;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 pb-12">
      {/* Notifications Tray */}
      {notifications && notifications.length > 0 && (
        <div className="space-y-3 pt-4">
          {notifications.slice(0, 3).map((notif, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-3"
            >
              <Bell className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm font-medium text-yellow-800">{notif.message}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Daily Reminder */}
      {!updatedToday && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-3xl shadow-sm flex items-center justify-between mt-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Daily Wellness Check-in</h3>
              <p className="text-sm text-amber-700">You haven't updated your stress levels today. Please take a moment to check in.</p>
            </div>
          </div>
          <Link href="/wellness">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">Start Now</Button>
          </Link>
        </motion.div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <Zap className="w-7 h-7 text-white fill-white" />
             </div>
             <h1 className="text-4xl font-black font-display tracking-tight text-gray-900">Hello, {user.name.split(' ')[0]}!</h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Your personal wellness & productivity mission control.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl flex items-center gap-6"
        >
          <div className="text-center px-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Health Status</p>
            <StressBadge level={user.currentStress} />
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <Button 
            onClick={() => helpMutation.mutate()}
            disabled={helpMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-white rounded-2xl h-14 px-6 font-bold shadow-lg shadow-red-200 flex items-center gap-2 group"
          >
            <LifeBuoy className="w-5 h-5 group-hover:animate-spin" />
            SOS Support
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Chat Interface */}
        <div className="lg:col-span-4 space-y-6">
          <Link href="/wellness">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-6 rounded-2xl shadow-xl hover:scale-105 transition-transform font-bold text-lg w-full">
              Update Stress Status
            </Button>
          </Link>

          <Card className="glass-card border-none shadow-xl rounded-3xl p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-yellow-500" />
                Peer Assistance
              </CardTitle>
              <CardDescription>Request help from low-stress colleagues</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {eligibleHelpers && eligibleHelpers.length > 0 ? (
                <div className="space-y-2">
                  {eligibleHelpers.map((helper: any) => (
                    <div key={helper.id} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-2xl border border-yellow-100">
                      <div>
                        <p className="font-bold text-sm">{helper.name}</p>
                        <p className="text-[10px] text-gray-500">Stress: {helper.currentStress}/5</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-yellow-600 font-bold hover:bg-yellow-100"
                        onClick={() => helpRequestMutation.mutate(helper.id)}
                        disabled={helpRequestMutation.isPending}
                      >
                        Request
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No eligible helpers available right now.</p>
              )}

              {helpRequests && helpRequests.some(r => r.helperId === user.id && r.status === 'pending') && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Incoming Requests</p>
                  {helpRequests.filter(r => r.helperId === user.id && r.status === 'pending').map((req: any) => (
                    <div key={req.id} className="bg-yellow-400/10 p-4 rounded-2xl border border-yellow-200">
                      <p className="text-sm font-bold mb-3">{req.requester?.name} has requested your assistance.</p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl flex-1 font-bold"
                          onClick={() => respondHelpMutation.mutate({ id: req.id, status: 'accepted' })}
                          disabled={respondHelpMutation.isPending}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl flex-1 font-bold"
                          onClick={() => respondHelpMutation.mutate({ id: req.id, status: 'rejected' })}
                          disabled={respondHelpMutation.isPending}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {isBurnoutRisk && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border-2 border-red-200 p-5 rounded-3xl shadow-lg shadow-red-100 flex items-start gap-4"
            >
              <div className="bg-red-500 p-3 rounded-2xl text-white shadow-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-red-900 leading-tight">Burnout Risk Detected ⚠</h3>
                <p className="text-xs text-red-700 mt-1 font-medium leading-relaxed">
                  Consistent high stress levels detected. Admin has been alerted to provide support.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Col: Graphs and Tasks */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mood Trend Graph */}
            <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-yellow-500" />
                   <CardTitle className="text-xl font-black text-gray-800">Stress Prediction</CardTitle>
                </div>
                <CardDescription className="text-xs font-medium">Last 7 days mood trend</CardDescription>
              </CardHeader>
              <CardContent className="h-60 pt-4 px-2">
                {stressHistory && stressHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stressHistory.slice(-7)}>
                      <defs>
                        <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis 
                        dataKey="date" 
                        hide 
                      />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                        labelFormatter={(label) => format(new Date(label), 'EEEE, MMM d')}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="stressLevel" 
                        stroke="#eab308" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorStress)"
                        dot={{ r: 6, fill: "#eab308", strokeWidth: 3, stroke: "white" }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                    Log your first check-in to see trends.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 border-none shadow-2xl rounded-[2.5rem] text-white overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform">
                  <Brain className="w-32 h-32" />
               </div>
               <CardHeader>
                  <CardTitle className="text-2xl font-black">AI Suggestions</CardTitle>
                  <CardDescription className="text-white/80 font-medium">Personalized for you</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4 pt-2">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                     <p className="text-sm font-bold leading-relaxed">
                        {user.currentStress >= 4 
                          ? "We've notified the team to handle heavy tasks. Please prioritize resting today. 🛌"
                          : user.currentStress === 3 
                            ? "Try a 10-minute walk outside to refresh your focus. 🚶‍♂️"
                            : "You're in a great state! A good time to tackle complex problems. 🚀"}
                     </p>
                  </div>
                  <div className="flex gap-2">
                     <span className="text-[10px] font-black uppercase px-2 py-1 bg-white/30 rounded-full tracking-widest">Self-Care</span>
                     <span className="text-[10px] font-black uppercase px-2 py-1 bg-white/30 rounded-full tracking-widest">Wellness</span>
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between py-6">
              <div>
                <CardTitle className="text-2xl font-black text-gray-800">My Mission Board</CardTitle>
                <CardDescription className="font-medium">Active tasks for today</CardDescription>
              </div>
              <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-2xl font-black text-sm">
                {tasks?.filter((t: any) => t.status === 'Pending').length || 0} ACTIVE
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {tasksLoading ? (
                <div className="p-12 text-center text-muted-foreground font-bold">Initializing tasks...</div>
              ) : tasks?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-bold text-lg">Mission Complete! No tasks pending.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {tasks?.map((task: any) => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-6 flex items-center gap-6 group hover:bg-yellow-50/30 transition-all ${task.status === 'Completed' ? 'bg-gray-50/50 opacity-60' : ''}`}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`w-12 h-12 rounded-2xl shadow-sm transition-all ${task.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-white border-2 border-gray-100 text-gray-300 hover:border-yellow-400 hover:text-yellow-500'}`}
                          onClick={() => task.status !== 'Completed' && completeTask(task.id)}
                          disabled={task.status === 'Completed'}
                        >
                          {task.status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </Button>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-bold text-lg ${task.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                               {task.title}
                            </h4>
                            <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase border ${
                              task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200' :
                              task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                              'bg-green-50 text-green-600 border-green-200'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                               <Clock className="w-3 h-3" />
                               {format(new Date(task.createdAt), 'h:mm a')}
                            </div>
                            <div className="flex items-center gap-1.5">
                               <TrendingUp className="w-3 h-3" />
                               ID: {task.id}
                            </div>
                          </div>
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
