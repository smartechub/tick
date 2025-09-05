import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, Filter, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePageViewTracking, useActivityTracker } from "@/hooks/use-activity-tracker";

interface ActivityLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  method: string | null;
  endpoint: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  details: string | null;
  success: boolean;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
  user?: {
    name: string;
    employeeId: string;
    email: string;
  };
}

export default function AuditLogs() {
  // Track page view for this admin page
  usePageViewTracking();
  const { trackClick, trackSearch } = useActivityTracker();

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });

  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/activity-logs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      return fetch(`/api/activity-logs?${params.toString()}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch activity logs');
        return res.json();
      });
    }
  });

  const handleSearch = () => {
    trackSearch(searchTerm, data?.total || 0);
    setFilters(prev => ({ ...prev, userId: searchTerm, page: 1 }));
  };

  const handleRefresh = () => {
    trackClick('refresh-audit-logs');
    refetch();
  };

  const handleDownload = () => {
    trackClick('download-audit-logs', { format: 'csv' });
    // TODO: Implement CSV download
    alert('Download functionality coming soon!');
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login':
      case 'logout':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'api_call':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'click':
      case 'page_view':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'form_submit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'file_upload':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDetails = (details: string | null) => {
    if (!details) return '-';
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed).slice(0, 3).map(([key, value]) => 
        `${key}: ${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}`
      ).join(', ');
    } catch {
      return details.substring(0, 50) + (details.length > 50 ? '...' : '');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6" data-testid="audit-logs-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="page-title">Audit Logs</h1>
        <p className="text-muted-foreground">
          Comprehensive activity tracking and monitoring for all user actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by user, action, resource, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">User Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Employee ID, name, or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="user-search-input"
                />
                <Button onClick={handleSearch} data-testid="search-button">
                  Search
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={filters.action} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, action: value, page: 1 }))
              }>
                <SelectTrigger data-testid="action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="api_call">API Call</SelectItem>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="form_submit">Form Submit</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Resource</label>
              <Input
                placeholder="e.g., tickets, users"
                value={filters.resource}
                onChange={(e) => setFilters(prev => ({ ...prev, resource: e.target.value, page: 1 }))}
                data-testid="resource-filter"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="flex-1"
                data-testid="refresh-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleDownload} 
                variant="outline"
                data-testid="download-button"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs ({total} total)</CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} activity logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: ActivityLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="text-sm">
                          <div className="font-medium">{log.user.name}</div>
                          <div className="text-muted-foreground">#{log.user.employeeId}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.resource || '-'}
                      {log.resourceId && (
                        <div className="text-xs text-muted-foreground">
                          ID: {log.resourceId.substring(0, 8)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.method ? (
                        <Badge variant={log.method === 'GET' ? 'secondary' : 'outline'}>
                          {log.method}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                      {log.duration && (
                        <div className="text-xs text-muted-foreground">
                          {log.duration}ms
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-muted-foreground truncate">
                        {formatDetails(log.details)}
                      </div>
                      {log.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > filters.limit && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {filters.page} of {Math.ceil(total / filters.limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  data-testid="previous-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={filters.page >= Math.ceil(total / filters.limit)}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  data-testid="next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}