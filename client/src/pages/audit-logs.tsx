import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Download, Filter, RefreshCw, Eye } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  const handleViewDetails = (log: ActivityLog) => {
    trackClick('view-audit-log-details', { logId: log.id });
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login_success':
      case 'logout':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'login_failed':
      case 'password_change_failed':
      case 'password_reset_failed':
      case 'forgot_password_failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'password_change_success':
      case 'password_reset_success':
      case 'forgot_password_success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'click':
      case 'page_view':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
              <Select value={filters.action || undefined} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, action: value || '', page: 1 }))
              }>
                <SelectTrigger data-testid="action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="login_success">Login Success</SelectItem>
                  <SelectItem value="login_failed">Login Failed</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="password_change_success">Password Change</SelectItem>
                  <SelectItem value="password_change_failed">Password Change Failed</SelectItem>
                  <SelectItem value="password_reset_success">Password Reset</SelectItem>
                  <SelectItem value="password_reset_failed">Password Reset Failed</SelectItem>
                  <SelectItem value="forgot_password_success">Forgot Password</SelectItem>
                  <SelectItem value="forgot_password_failed">Forgot Password Failed</SelectItem>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                        data-testid={`view-details-${log.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
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

      {/* Activity Log Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              Complete information for this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Log ID</label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">
                    {format(new Date(selectedLog.createdAt), 'PPpp')} <br />
                    <span className="text-muted-foreground">
                      ({formatDistanceToNow(new Date(selectedLog.createdAt), { addSuffix: true })})
                    </span>
                  </p>
                </div>
              </div>

              {/* User Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User</label>
                    <p className="text-sm">
                      {selectedLog.user ? (
                        <>
                          <span className="font-medium">{selectedLog.user.name}</span><br />
                          <span className="text-muted-foreground">#{selectedLog.user.employeeId}</span><br />
                          <span className="text-muted-foreground">{selectedLog.user.email}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">System / Anonymous</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                      {selectedLog.sessionId || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Action Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Action</label>
                    <p className="text-sm">
                      <Badge className={getActionBadgeColor(selectedLog.action)}>
                        {selectedLog.action.replace('_', ' ')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm">
                      <Badge variant={selectedLog.success ? 'default' : 'destructive'}>
                        {selectedLog.success ? 'Success' : 'Failed'}
                      </Badge>
                      {selectedLog.duration && (
                        <span className="ml-2 text-muted-foreground">({selectedLog.duration}ms)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resource</label>
                    <p className="text-sm">{selectedLog.resource || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resource ID</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                      {selectedLog.resourceId || '-'}
                    </p>
                  </div>
                </div>

                {selectedLog.method && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">HTTP Method</label>
                      <p className="text-sm">
                        <Badge variant={selectedLog.method === 'GET' ? 'secondary' : 'outline'}>
                          {selectedLog.method}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                      <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                        {selectedLog.endpoint || '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Technical Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <p className="text-xs bg-muted p-2 rounded break-all">
                      {selectedLog.userAgent || '-'}
                    </p>
                  </div>

                  {selectedLog.errorMessage && (
                    <div>
                      <label className="text-sm font-medium text-red-600">Error Message</label>
                      <p className="text-sm bg-red-50 dark:bg-red-950 p-2 rounded text-red-800 dark:text-red-200">
                        {selectedLog.errorMessage}
                      </p>
                    </div>
                  )}

                  {selectedLog.details && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Additional Details</label>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                          } catch {
                            return selectedLog.details;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}