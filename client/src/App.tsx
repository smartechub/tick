import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser, type AuthUser } from "./lib/auth";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Tickets from "./pages/tickets";
import CreateTicket from "./pages/create-ticket";
import TicketDetail from "./pages/ticket-detail";
import Reports from "./pages/reports";
import NotFound from "./pages/not-found";

function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/tickets/:id" component={TicketDetail} />
            <Route path="/tickets" component={Tickets} />
            <Route path="/create-ticket" component={CreateTicket} />
            <Route path="/reports" component={Reports} />
            <Route path="/">
              <Dashboard />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (newUser: AuthUser) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
