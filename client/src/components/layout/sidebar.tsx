import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Ticket, 
  Plus, 
  BarChart3, 
  Settings,
  Headphones,
  LogOut
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  user: AuthUser;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      onLogout();
      toast({
        title: "Logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'All Tickets', href: '/tickets', icon: Ticket },
    { name: 'Create Ticket', href: '/create-ticket', icon: Plus },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/reports' && user.role === 'employee') return false;
    if (item.href === '/settings' && user.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-card border-r border-border overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4" data-testid="sidebar-logo">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
            <Headphones className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="ml-3 text-lg font-semibold text-foreground">IT Support</span>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1" data-testid="sidebar-navigation">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="flex-shrink-0 border-t border-border p-4" data-testid="user-profile">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {getInitials(user.name)}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground" data-testid="user-name">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize" data-testid="user-role">
                    {user.role}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="p-2"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
