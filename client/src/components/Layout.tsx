import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, User, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();

  if (!user || location === '/') return <div className="min-h-screen">{children}</div>;

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 glass-panel md:min-h-screen p-6 flex flex-col border-r border-white/40 sticky top-0 z-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">D</div>
          <h1 className="text-2xl font-bold font-display text-primary-dark">DutySwap</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {user.role === 'admin' ? (
            <>
              <Link href="/admin">
                <Button variant={location === '/admin' ? "secondary" : "ghost"} className="w-full justify-start gap-3">
                  <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                </Button>
              </Link>
              <Link href="/admin/reallocation">
                <Button variant={location === '/admin/reallocation' ? "secondary" : "ghost"} className="w-full justify-start gap-3">
                  <LayoutDashboard className="w-4 h-4" /> Reallocation Logs
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard">
                <Button variant={location === '/dashboard' ? "secondary" : "ghost"} className="w-full justify-start gap-3">
                  <User className="w-4 h-4" /> My Dashboard
                </Button>
              </Link>
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-border mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-amber-300 flex items-center justify-center text-white font-bold shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => logout()}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
