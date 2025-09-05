import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Search, Menu, Clock, AlertCircle } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  user: AuthUser;
}

const NotificationsList = () => {
  const { data: recentTickets } = useQuery({
    queryKey: ['/api/tickets', { limit: 5 }],
    queryFn: () => fetch('/api/tickets?limit=5&sort=createdAt&order=desc').then(res => res.json())
  });

  const tickets = recentTickets?.tickets || [];

  if (tickets.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No recent notifications
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto">
      {tickets.map((ticket: any) => (
        <DropdownMenuItem key={ticket.id} className="flex items-start gap-3 p-3">
          <div className="flex-shrink-0 mt-1">
            {ticket.priority === 'critical' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              New ticket: {ticket.title}
            </p>
            <p className="text-xs text-muted-foreground">
              #{ticket.ticketNumber} • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </p>
          </div>
        </DropdownMenuItem>
      ))}
    </div>
  );
};

export function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getPageTitle = () => {
    const pathTitles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/tickets': 'All Tickets',
      '/create-ticket': 'Create Ticket',
      '/reports': 'Reports',
      '/user-management': 'User Management',
      '/settings': 'Settings',
    };
    
    if (location.startsWith('/tickets/') && location !== '/tickets') {
      return 'Ticket Details';
    }
    
    return pathTitles[location] || 'Dashboard';
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden p-2"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground ml-2" data-testid="page-title">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4"
              data-testid="search-input"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </form>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <NotificationsList />
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
}
