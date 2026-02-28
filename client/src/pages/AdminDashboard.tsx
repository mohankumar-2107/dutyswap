import { useEmployees, useCreateEmployee } from "@/hooks/use-employees";
import { useTasks, useCreateTask, useReassignTask, useCompleteTask } from "@/hooks/use-tasks";
import { useAdminStats, useDutyLogs } from "@/hooks/use-stress";
import { StressBadge } from "@/components/StressBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Users, AlertTriangle, CheckCircle, BarChart3, Plus, Search, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Amber, Red

export default function AdminDashboard() {
  const { data: employees } = useEmployees();
  const { data: stats } = useAdminStats();
  const { mutate: createEmployee } = useCreateEmployee();
  const { mutate: createTask } = useCreateTask();
  const { data: allTasks } = useTasks();
  const { toast } = useToast();

  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newAssignee, setNewAssignee] = useState("");

  const reassignMutation = useReassignTask();

  const handleReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newAssignee) return;
    reassignMutation.mutate({ taskId: selectedTask.id, newAssigneeId: parseInt(newAssignee) }, {
      onSuccess: () => {
        setIsReassignOpen(false);
        toast({ title: "Task Reassigned", description: "The task has been successfully moved." });
      }
    });
  };
  
  // Employee Form State
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("employee");

  // Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskAssignee, setTaskAssignee] = useState("");

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployee({ name: empName, role: empRole, username: empName.toLowerCase().replace(/\s/g, '') }, {
      onSuccess: () => {
        setIsEmployeeOpen(false);
        setEmpName("");
        toast({ title: "Employee Created", description: `${empName} added successfully.` });
      }
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskAssignee) return;
    createTask({ 
      title: taskTitle, 
      priority: taskPriority, 
      assignedToId: parseInt(taskAssignee) 
    }, {
      onSuccess: () => {
        setIsTaskOpen(false);
        setTaskTitle("");
        setTaskAssignee("");
        toast({ title: "Task Assigned", description: "Task successfully assigned." });
      }
    });
  };

  const pieData = stats ? [
    { name: 'Low', value: stats.lowStress || 0 },
    { name: 'Medium', value: stats.mediumStress || 0 },
    { name: 'High', value: stats.highStress || 0 },
  ] : [
    { name: 'Low', value: 0 },
    { name: 'Medium', value: 0 },
    { name: 'High', value: 0 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor team wellness and operational efficiency.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Create a new user account for the system.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEmployee} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={empRole} onValueChange={setEmpRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign New Task</DialogTitle>
                <DialogDescription>Delegate work to a team member.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Prepare Q4 Report" required />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                    <SelectTrigger className="rounded-xl border-gray-100"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl">Assign Task</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-l-4 border-l-blue-500 rounded-[2rem]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Staff</p>
                <h3 className="text-3xl font-black text-gray-900 leading-none">{stats?.totalEmployees || 0}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-green-500 rounded-[2rem]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Low Stress</p>
                <h3 className="text-3xl font-black text-green-600 leading-none">{stats?.lowStress || 0}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-amber-500 rounded-[2rem]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reallocations</p>
                <h3 className="text-3xl font-black text-amber-600 leading-none">{stats?.reassignedTasks || 0}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl">
                <BarChart3 className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-red-500 rounded-[2rem]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">High Stress</p>
                <h3 className="text-3xl font-black text-red-600 leading-none">{stats?.highStress || 0}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Table */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Team Status</CardTitle>
              <CardDescription>Real-time stress monitoring for all employees.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="text-xs font-black text-gray-400 uppercase tracking-widest">Employee</TableHead>
                      <TableHead className="text-xs font-black text-gray-400 uppercase tracking-widest">Role</TableHead>
                      <TableHead className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees?.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-yellow-50/30 transition-colors border-gray-50">
                        <TableCell className="font-bold text-gray-900">{emp.name}</TableCell>
                        <TableCell className="capitalize font-medium text-gray-500">{emp.role}</TableCell>
                        <TableCell><StressBadge level={emp.currentStress} /></TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-xl font-bold text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                            onClick={() => {
                              const task = allTasks?.find(t => t.assignedToId === emp.id && t.status === 'Pending');
                              if (task) {
                                setSelectedTask(task);
                                setNewAssignee(""); // Reset assignee when picking a new task
                                // Scroll to the reallocation card for better UX
                                document.getElementById('manual-reallocation-card')?.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                toast({ title: "No Pending Tasks", description: `${emp.name} has no pending tasks to reallocate.` });
                              }
                            }}
                          >
                            Manage Tasks
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Reallocation */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Stress Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Low</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Medium</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> High</div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card" id="manual-reallocation-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-yellow-500" />
                Manual Reallocation
              </CardTitle>
              <CardDescription>Shift tasks between employees manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black text-gray-400">Select Task to Move</Label>
                <Select 
                  value={selectedTask?.id?.toString() || ""} 
                  onValueChange={(val) => {
                    setSelectedTask(allTasks?.find(t => t.id === parseInt(val)));
                    setNewAssignee("");
                  }}
                >
                  <SelectTrigger className="rounded-xl border-gray-100"><SelectValue placeholder="Choose a pending task..." /></SelectTrigger>
                  <SelectContent>
                    {allTasks?.filter(t => t.status === 'Pending').map(task => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        {task.title} (Currently: {task.assignee?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTask && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="text-xs font-bold text-yellow-800">Current Assignee Stress:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StressBadge level={selectedTask.assignee?.currentStress} />
                      <span className="text-xs text-yellow-700">{selectedTask.assignee?.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black text-gray-400">Move To (Low Stress Only)</Label>
                    <Select value={newAssignee} onValueChange={setNewAssignee}>
                      <SelectTrigger className="rounded-xl border-gray-100"><SelectValue placeholder="Select replacement..." /></SelectTrigger>
                      <SelectContent>
                        {employees?.filter(e => e.id !== selectedTask.assignedToId && e.role === 'employee' && (e.currentStress || 0) <= 2).map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} (Stress: {emp.currentStress || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl"
                    onClick={handleReassign}
                    disabled={!newAssignee || reassignMutation.isPending}
                  >
                    Confirm Manual Swap
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
