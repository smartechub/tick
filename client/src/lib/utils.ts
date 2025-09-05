import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInMs = now.getTime() - then.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return formatDate(date);
}

export function calculateSLAProgress(deadline: string | Date): { 
  percentage: number; 
  timeLeft: string; 
  status: 'good' | 'warning' | 'danger' | 'expired';
} {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffInMs = deadlineDate.getTime() - now.getTime();
  
  if (diffInMs <= 0) {
    return { percentage: 100, timeLeft: 'Expired', status: 'expired' };
  }
  
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Calculate percentage based on a 4-hour SLA (this would be configurable)
  const totalSLAHours = 4;
  const percentage = Math.max(0, Math.min(100, ((totalSLAHours * 60 * 60 * 1000 - diffInMs) / (totalSLAHours * 60 * 60 * 1000)) * 100));
  
  let timeLeft: string;
  if (diffInHours >= 1) {
    timeLeft = `${Math.floor(diffInHours)}h ${diffInMinutes}m`;
  } else {
    timeLeft = `${Math.floor(diffInMs / (1000 * 60))}m`;
  }
  
  let status: 'good' | 'warning' | 'danger' | 'expired';
  if (percentage >= 75) status = 'danger';
  else if (percentage >= 50) status = 'warning';
  else status = 'good';
  
  return { percentage, timeLeft, status };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
