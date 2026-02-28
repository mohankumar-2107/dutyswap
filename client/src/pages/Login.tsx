import { useState } from "react";
import { useLogin, useEmployees } from "@/hooks/use-auth"; // Need to fetch employees for the dropdown
import { useEmployees as useEmployeesList } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending } = useLogin();
  const { data: employees } = useEmployeesList();
  const { toast } = useToast();

  const [adminUser, setAdminUser] = useState("admin");
  const [adminPass, setAdminPass] = useState("admin123");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(
      { role: 'admin', username: adminUser, password: adminPass },
      {
        onSuccess: (user) => {
          localStorage.setItem("last_employee_id", user.id.toString());
          toast({ title: "Welcome back, Admin!", description: "Accessing secure dashboard." });
          setLocation("/admin");
        },
        onError: (err) => {
          toast({ title: "Login Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleEmployeeLogin = () => {
    if (!selectedEmployeeId) return;
    login(
      { role: 'employee', employeeId: parseInt(selectedEmployeeId) },
      {
        onSuccess: (user) => {
          localStorage.setItem("last_employee_id", user.id.toString());
          toast({ title: "Welcome!", description: "Logging into your dashboard." });
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({ title: "Login Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply filter animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl opacity-50 mix-blend-multiply filter animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl opacity-50 mix-blend-multiply filter animate-blob animation-delay-4000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-display text-primary-dark mb-2">DutySwap</h1>
          <p className="text-muted-foreground">Intelligent Stress Management & Task Reallocation</p>
        </div>

        <Card className="glass-card border-none shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Select your role to continue</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="employee" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1">
                <TabsTrigger value="employee" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="w-4 h-4 mr-2" /> Employee
                </TabsTrigger>
                <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Admin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="employee" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Identity (Demo Mode)</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="bg-white/50 border-white/40 h-12">
                      <SelectValue placeholder="Who are you?" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.filter(e => e.role === 'employee').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
                  onClick={handleEmployeeLogin}
                  disabled={!selectedEmployeeId || isPending}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : "Enter Dashboard"}
                </Button>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={adminUser} 
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="bg-white/50 border-white/40 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={adminPass} 
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="bg-white/50 border-white/40 h-11"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/25"
                    disabled={isPending}
                  >
                     {isPending ? <Loader2 className="animate-spin" /> : "Access Admin Panel"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
