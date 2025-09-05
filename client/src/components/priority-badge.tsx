import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const variants = {
    low: 'bg-green-100 text-green-800 hover:bg-green-100',
    medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    high: 'bg-red-100 text-red-800 hover:bg-red-100',
    critical: 'bg-purple-100 text-purple-800 hover:bg-purple-100'
  };

  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(variants[priority], className)}
      data-testid={`priority-badge-${priority}`}
    >
      {labels[priority]}
    </Badge>
  );
}
