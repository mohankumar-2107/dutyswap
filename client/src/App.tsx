import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ReallocationLogs from "@/pages/ReallocationLogs";
import NotFound from "@/pages/not-found";

import WellnessCheckin from "@/pages/WellnessCheckin";

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: 'admin' | 'employee' }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && window.location.pathname !== "/") {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && window.location.pathname !== "/") {
    return null;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <div className="p-8 text-center text-red-500">Access Denied: You do not have permission to view this page.</div>;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        
        {/* Protected Routes */}
        <Route path="/dashboard">
          <ProtectedRoute component={EmployeeDashboard} allowedRole="employee" />
        </Route>

        <Route path="/wellness">
          <ProtectedRoute component={WellnessCheckin} allowedRole="employee" />
        </Route>
        
        <Route path="/admin">
          <ProtectedRoute component={AdminDashboard} allowedRole="admin" />
        </Route>

        <Route path="/admin/reallocation">
          <ProtectedRoute component={ReallocationLogs} allowedRole="admin" />
        </Route>

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
