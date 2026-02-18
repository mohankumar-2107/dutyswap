import { useEmployees, useCreateEmployee } from "@/hooks/use-employees";
import { useTasks, useCreateTask } from "@/hooks/use-tasks";
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
import { Users, AlertTriangle, CheckCircle, BarChart3, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Amber, Red

export default function AdminDashboard() {
  const { data: employees } = useEmployees();
  const { data: stats } = useAdminStats();
  const { mutate: createEmployee } = useCreateEmployee();
  const { mutate: createTask } = useCreateTask();
  const { toast } = useToast();

  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  
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
    { name: 'Low', value: stats.lowStress },
    { name: 'Medium', value: stats.mediumStress },
    { name: 'High', value: stats.highStress },
  ] : [];

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
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Assign Task</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <h3 className="text-2xl font-bold">{stats?.totalEmployees || 0}</h3>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stress</p>
                <h3 className="text-2xl font-bold text-green-600">{stats?.lowStress || 0}</h3>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reallocations</p>
                <h3 className="text-2xl font-bold text-amber-600">{stats?.reassignedTasks || 0}</h3>
              </div>
              <BarChart3 className="w-8 h-8 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Stress</p>
                <h3 className="text-2xl font-bold text-red-600">{stats?.highStress || 0}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{emp.role}</TableCell>
                      <TableCell><StressBadge level={emp.currentStress} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
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
        </div>
      </div>
    </div>
  );
}
