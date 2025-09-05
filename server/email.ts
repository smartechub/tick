import nodemailer from 'nodemailer';
import { storage } from './storage';

interface EmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
  itTeamEmail: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

export class EmailService {
  private async getEmailSettings(): Promise<EmailSettings | null> {
    try {
      const settings = await storage.getSettings('email');
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      if (!settingsMap.email_notifications_enabled || settingsMap.email_notifications_enabled !== 'true') {
        return null;
      }

      return {
        enabled: true,
        host: settingsMap.smtp_host || '',
        port: parseInt(settingsMap.smtp_port || '587'),
        username: settingsMap.smtp_username || '',
        password: settingsMap.smtp_password || '',
        senderName: settingsMap.sender_name || 'IT Support Team',
        senderEmail: settingsMap.sender_email || '',
        itTeamEmail: settingsMap.it_team_email || ''
      };
    } catch (error) {
      console.error('Failed to load email settings:', error);
      return null;
    }
  }

  private async createTransporter(settings: EmailSettings) {
    const transportConfig: any = {
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465, // true for SSL, false for STARTTLS
      auth: {
        user: settings.username,
        pass: settings.password
      }
    };

    // For Gmail and other providers that use TLS
    if (settings.port === 587) {
      transportConfig.requireTLS = true;
    }

    return nodemailer.createTransport(transportConfig);
  }

  async sendTestEmail(testEmail: string, testSettings?: any): Promise<boolean> {
    try {
      let settings = testSettings;
      
      if (!settings) {
        settings = await this.getEmailSettings();
        if (!settings) {
          throw new Error('Email notifications are disabled or not configured');
        }
      }

      if (!settings.host || !settings.username || !settings.password) {
        throw new Error('SMTP configuration is incomplete. Please fill in Host, Username, and Password fields.');
      }

      const transporter = await this.createTransporter(settings);

      const mailOptions = {
        from: `"${settings.senderName}" <${settings.senderEmail || settings.username}>`,
        to: testEmail,
        subject: 'IT Support System - Test Email Configuration',
        text: `This is a test email from your IT Support ticketing system.

If you received this email, your SMTP configuration is working correctly!

Configuration details:
- SMTP Host: ${settings.host}
- SMTP Port: ${settings.port}
- Sender: ${settings.senderName} <${settings.senderEmail || settings.username}>

Best regards,
${settings.senderName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">IT Support System - Test Email</h2>
          <p>This is a test email from your IT Support ticketing system.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #16a34a; font-weight: bold;">✅ SMTP Configuration Test Successful!</p>
            <p style="margin: 10px 0 0 0;">If you received this email, your SMTP settings are working correctly.</p>
          </div>
          
          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>SMTP Host:</strong> ${settings.host}</li>
            <li><strong>SMTP Port:</strong> ${settings.port}</li>
            <li><strong>Sender:</strong> ${settings.senderName} &lt;${settings.senderEmail || settings.username}&gt;</li>
          </ul>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            ${settings.senderName}
          </p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`Test email sent successfully to ${testEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      throw error;
    }
  }

  async sendTicketCreatedEmail(ticket: any, employeeEmail: string): Promise<void> {
    try {
      const settings = await this.getEmailSettings();
      if (!settings) return;

      const settingsMap = await this.getTemplateSettings();
      const subject = this.interpolateTemplate(
        settingsMap.ticket_created_subject || 'New Support Ticket Created - #{ticketNumber}',
        ticket
      );
      const body = this.interpolateTemplate(
        settingsMap.ticket_created_body || this.getDefaultTicketCreatedBody(),
        ticket
      );

      const transporter = await this.createTransporter(settings);

      // Send to employee
      await transporter.sendMail({
        from: `"${settings.senderName}" <${settings.senderEmail || settings.username}>`,
        to: employeeEmail,
        subject,
        text: body,
        html: this.convertToHtml(body)
      });

      // Send to IT team if configured
      if (settings.itTeamEmail) {
        await transporter.sendMail({
          from: `"${settings.senderName}" <${settings.senderEmail || settings.username}>`,
          to: settings.itTeamEmail,
          subject: `[IT NOTIFICATION] ${subject}`,
          text: `IT Team Notification:\n\n${body}`,
          html: this.convertToHtml(`<strong>IT Team Notification:</strong><br><br>${body}`)
        });
      }

      console.log(`Ticket created emails sent for ticket ${ticket.ticketNumber}`);
    } catch (error) {
      console.error('Failed to send ticket created email:', error);
    }
  }

  private async getTemplateSettings(): Promise<Record<string, string>> {
    const settings = await storage.getSettings('email');
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
  }

  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private getDefaultTicketCreatedBody(): string {
    return `Dear {employeeName},

Your support ticket has been successfully created.

Ticket Details:
- Ticket Number: {ticketNumber}
- Title: {title}
- Priority: {priority}
- Status: {status}

We will review your ticket and respond as soon as possible.

Best regards,
IT Support Team`;
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }
}

export const emailService = new EmailService();