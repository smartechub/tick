import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { Link } from "wouter";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { SLATimer } from "@/components/sla-timer";
import { formatDateTime } from "@/lib/utils";

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  slaBreaches: number;
}

interface DashboardTicket {
  id: string;
  ticketNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  assignedToId: string | null;
  createdAt: string;
  slaDeadline: string | null;
  employeeName: string;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<TicketStats>({
    queryKey: ['/api/tickets/stats'],
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{
    tickets: DashboardTicket[];
    total: number;
  }>({
    queryKey: ['/api/tickets', { limit: 10 }],
  });

  const recentTickets = ticketsData?.tickets || [];

  const statCards = [
    {
      title: "Total Tickets",
      value: stats?.total || 0,
      icon: Ticket,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Open Tickets",
      value: stats?.open || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Resolved Today",
      value: stats?.resolved || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "SLA Breaches",
      value: stats?.slaBreaches || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    }
  ];

  if (statsLoading || ticketsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-cards">
        {statCards.map((stat, index) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <stat.icon className={`${stat.color} h-5 w-5`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest tickets that need attention</CardDescription>
          </div>
          <Link href="/create-ticket">
            <Button data-testid="button-create-ticket">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Ticket ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Requester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      SLA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border" data-testid="tickets-table-body">
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link 
                          href={`/tickets/${ticket.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                          data-testid={`ticket-link-${ticket.ticketNumber}`}
                        >
                          {ticket.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                        {ticket.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                        {ticket.employeeName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ticket.slaDeadline ? (
                          <SLATimer 
                            deadline={ticket.slaDeadline} 
                            status={ticket.status}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No SLA</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
