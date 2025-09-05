import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TicketStatusBadgeProps {
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const variants = {
    open: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    in_progress: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    on_hold: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    resolved: 'bg-green-100 text-green-800 hover:bg-green-100',
    closed: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  };

  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(variants[status], className)}
      data-testid={`status-badge-${status}`}
    >
      {labels[status]}
    </Badge>
  );
}
