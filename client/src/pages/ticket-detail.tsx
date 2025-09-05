import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, MessageSquare, Clock, User, Calendar, Tag, Building } from "lucide-react";
import { Link } from "wouter";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { SLATimer } from "@/components/sla-timer";
import { formatDateTime, getTimeAgo, getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeMobile: string;
  employeeDepartment: string;
  assignedToId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string | null;
}

interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
}

export default function TicketDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [newComment, setNewComment] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ticketData, isLoading } = useQuery<{
    ticket: TicketDetail;
    comments: Comment[];
    attachments: Attachment[];
  }>({
    queryKey: ['/api/tickets', id],
    enabled: !!id,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Partial<TicketDetail>) => {
      const response = await apiRequest('PATCH', `/api/tickets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ticket Updated",
        description: "The ticket has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/tickets/${id}/comments`, {
        content,
        isInternal: false,
      });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the ticket.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (statusUpdate && statusUpdate !== ticketData?.ticket.status) {
      updateTicketMutation.mutate({ status: statusUpdate as any });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const handleDownloadAttachment = (attachmentId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachmentId}/download`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticketData || !ticketData.ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Link href="/tickets">
          <Button className="mt-4">Back to Tickets</Button>
        </Link>
      </div>
    );
  }

  const { ticket, comments = [], attachments = [] } = ticketData;

  return (
    <div className="space-y-6" data-testid="ticket-detail-view">
      <Card>
        {/* Header */}
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/tickets">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tickets
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="ticket-title">
                  {ticket.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ticket ID: <span className="font-medium">{ticket.ticketNumber}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <PriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Description</h3>
                <div className="prose prose-sm max-w-none text-foreground bg-muted p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                        data-testid={`attachment-${attachment.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                          data-testid={`download-attachment-${attachment.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Activity</h3>
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3" data-testid={`comment-${comment.id}`}>
                        <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary-foreground">
                            {getInitials("User Name")} {/* In real app, get user name from comment.userId */}
                          </span>
                        </div>
                        <div className="flex-1 bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground">User Name</h4>
                            <span className="text-xs text-muted-foreground">
                              {getTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="mt-6 space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    data-testid="textarea-new-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      data-testid="button-add-comment"
                    >
                      {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ticket Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ticket Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Requester</p>
                      <p className="text-sm font-medium">{ticket.employeeName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{ticket.employeeDepartment}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-medium">{ticket.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium">{getTimeAgo(ticket.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SLA Status */}
              {ticket.slaDeadline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      SLA Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SLATimer deadline={ticket.slaDeadline} status={ticket.status} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Response time based on {ticket.priority} priority
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Update Status</p>
                    <Select value={statusUpdate || ticket.status} onValueChange={setStatusUpdate}>
                      <SelectTrigger data-testid="select-status-update">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={!statusUpdate || statusUpdate === ticket.status || updateTicketMutation.isPending}
                      className="w-full"
                      data-testid="button-update-status"
                    >
                      {updateTicketMutation.isPending ? "Updating..." : "Update Status"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
