import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, Menu } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";
import { useState } from "react";

interface HeaderProps {
  user: AuthUser;
}

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
          <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
          </Button>

          {/* User Menu */}
          <div className="relative flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {getInitials(user.name)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
