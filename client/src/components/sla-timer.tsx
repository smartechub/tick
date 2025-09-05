import { Progress } from "@/components/ui/progress";
import { calculateSLAProgress } from "@/lib/utils";
import { Clock } from "lucide-react";

interface SLATimerProps {
  deadline: string;
  status?: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
}

export function SLATimer({ deadline, status }: SLATimerProps) {
  if (status === 'resolved' || status === 'closed') {
    return (
      <div className="flex items-center text-green-600" data-testid="sla-completed">
        <Clock className="h-4 w-4 mr-1" />
        <span className="text-xs font-medium">Completed</span>
      </div>
    );
  }

  const { percentage, timeLeft, status: slaStatus } = calculateSLAProgress(deadline);
  
  const colors = {
    good: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
    expired: 'bg-red-600'
  };

  const textColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    expired: 'text-red-600'
  };

  return (
    <div className="flex items-center space-x-2" data-testid="sla-timer">
      <div className="flex-1">
        <Progress 
          value={percentage} 
          className="h-2"
          data-testid="sla-progress"
        />
      </div>
      <span className={`text-xs font-medium ${textColors[slaStatus]}`} data-testid="sla-time-remaining">
        {timeLeft}
      </span>
    </div>
  );
}
