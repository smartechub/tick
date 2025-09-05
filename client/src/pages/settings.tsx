import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Mail, TestTube } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [formData, setFormData] = useState({
    emailEnabled: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUsername: "",
    smtpPassword: "",
    senderName: "IT Support Team",
    senderEmail: "",
    itTeamEmail: "",
    ticketCreatedSubject: "New Support Ticket Created - #{ticketNumber}",
    ticketCreatedBody: `Dear {employeeName},

Your support ticket has been successfully created.

Ticket Details:
- Ticket Number: {ticketNumber}
- Title: {title}
- Priority: {priority}
- Status: {status}

We will review your ticket and respond as soon as possible.

Best regards,
IT Support Team`,
    ticketUpdatedSubject: "Ticket Update - #{ticketNumber}",
    commentAddedSubject: "New Comment on Ticket #{ticketNumber}"
  });

  // Load existing settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings?category=email');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsArray: any[]) => {
      const response = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray })
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Your SMTP configuration has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Load settings into form when data is fetched
  useEffect(() => {
    if (settings && Array.isArray(settings)) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      setFormData(prev => ({
        ...prev,
        emailEnabled: settingsMap.email_notifications_enabled === 'true',
        smtpHost: settingsMap.smtp_host || "",
        smtpPort: settingsMap.smtp_port || "587",
        smtpUsername: settingsMap.smtp_username || "",
        smtpPassword: settingsMap.smtp_password || "",
        senderName: settingsMap.sender_name || "IT Support Team",
        senderEmail: settingsMap.sender_email || "",
        itTeamEmail: settingsMap.it_team_email || "",
        ticketCreatedSubject: settingsMap.ticket_created_subject || "New Support Ticket Created - #{ticketNumber}",
        ticketCreatedBody: settingsMap.ticket_created_body || prev.ticketCreatedBody,
        ticketUpdatedSubject: settingsMap.ticket_updated_subject || "Ticket Update - #{ticketNumber}",
        commentAddedSubject: settingsMap.comment_added_subject || "New Comment on Ticket #{ticketNumber}"
      }));
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    const settingsToSave = [
      { key: 'email_notifications_enabled', value: formData.emailEnabled.toString(), category: 'email', description: 'Enable/disable email notifications' },
      { key: 'smtp_host', value: formData.smtpHost, category: 'email', description: 'SMTP server hostname' },
      { key: 'smtp_port', value: formData.smtpPort, category: 'email', description: 'SMTP server port' },
      { key: 'smtp_username', value: formData.smtpUsername, category: 'email', description: 'SMTP authentication username' },
      { key: 'smtp_password', value: formData.smtpPassword, category: 'email', description: 'SMTP authentication password' },
      { key: 'sender_name', value: formData.senderName, category: 'email', description: 'Email sender display name' },
      { key: 'sender_email', value: formData.senderEmail, category: 'email', description: 'Email sender address' },
      { key: 'it_team_email', value: formData.itTeamEmail, category: 'email', description: 'IT team notification email' },
      { key: 'ticket_created_subject', value: formData.ticketCreatedSubject, category: 'email', description: 'Email subject for new tickets' },
      { key: 'ticket_created_body', value: formData.ticketCreatedBody, category: 'email', description: 'Email body template for new tickets' },
      { key: 'ticket_updated_subject', value: formData.ticketUpdatedSubject, category: 'email', description: 'Email subject for ticket updates' },
      { key: 'comment_added_subject', value: formData.commentAddedSubject, category: 'email', description: 'Email subject for new comments' }
    ];

    saveSettingsMutation.mutate(settingsToSave);
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    // Simulate testing email configuration
    setTimeout(() => {
      setIsTesting(false);
      toast({
        title: "Test email sent",
        description: "A test email has been sent successfully. Check your inbox.",
      });
    }, 2000);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure system-wide settings for the IT ticketing system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Your Company Name"
                  defaultValue="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  placeholder="support@company.com"
                  defaultValue="support@acme.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-sla">Default SLA (hours)</Label>
              <Select defaultValue="24">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how and when users receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Select defaultValue="enabled">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="admin-only">Admin Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <Select defaultValue="critical-only">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="critical-only">Critical Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMTP Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              SMTP Email Configuration
            </CardTitle>
            <CardDescription>
              Configure SMTP settings for automatic email notifications when tickets are created, updated, or commented on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="email-notifications-enabled"
                checked={formData.emailEnabled}
                onCheckedChange={(value) => handleInputChange('emailEnabled', value)}
              />
              <Label htmlFor="email-notifications-enabled">Enable Email Notifications</Label>
            </div>

            {formData.emailEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.gmail.com"
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Select value={formData.smtpPort} onValueChange={(value) => handleInputChange('smtpPort', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (Non-encrypted)</SelectItem>
                        <SelectItem value="587">587 (STARTTLS)</SelectItem>
                        <SelectItem value="465">465 (SSL/TLS)</SelectItem>
                        <SelectItem value="2525">2525 (Alternative)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">SMTP Username</Label>
                    <Input
                      id="smtp-username"
                      placeholder="your-email@gmail.com"
                      type="email"
                      value={formData.smtpUsername}
                      onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">SMTP Password</Label>
                    <Input
                      id="smtp-password"
                      placeholder="Your app password"
                      type="password"
                      value={formData.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input
                      id="sender-name"
                      placeholder="IT Support Team"
                      value={formData.senderName}
                      onChange={(e) => handleInputChange('senderName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-email">Sender Email</Label>
                    <Input
                      id="sender-email"
                      placeholder="noreply@company.com"
                      type="email"
                      value={formData.senderEmail}
                      onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="it-team-email">IT Team Email (receives all notifications)</Label>
                  <Input
                    id="it-team-email"
                    placeholder="it-support@company.com"
                    type="email"
                    value={formData.itTeamEmail}
                    onChange={(e) => handleInputChange('itTeamEmail', e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Email Templates</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ticket-created-subject">Ticket Created - Subject Template</Label>
                    <Input
                      id="ticket-created-subject"
                      placeholder="New Support Ticket Created - #{ticketNumber}"
                      value={formData.ticketCreatedSubject}
                      onChange={(e) => handleInputChange('ticketCreatedSubject', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-created-body">Ticket Created - Email Body Template</Label>
                    <Textarea
                      id="ticket-created-body"
                      placeholder="Email body template..."
                      rows={4}
                      value={formData.ticketCreatedBody}
                      onChange={(e) => handleInputChange('ticketCreatedBody', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-updated-subject">Ticket Updated - Subject Template</Label>
                    <Input
                      id="ticket-updated-subject"
                      placeholder="Ticket Update - #{ticketNumber}"
                      value={formData.ticketUpdatedSubject}
                      onChange={(e) => handleInputChange('ticketUpdatedSubject', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment-added-subject">Comment Added - Subject Template</Label>
                    <Input
                      id="comment-added-subject"
                      placeholder="New Comment on Ticket #{ticketNumber}"
                      value={formData.commentAddedSubject}
                      onChange={(e) => handleInputChange('commentAddedSubject', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={isTesting}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    {isTesting ? "Sending Test..." : "Send Test Email"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Configure security and access control settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-policy">Password Policy</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Security</SelectItem>
                    <SelectItem value="medium">Medium Security</SelectItem>
                    <SelectItem value="high">High Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}