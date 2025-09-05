import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { insertTicketSchema, insertCommentSchema, insertUserSchema, insertSettingSchema } from "@shared/schema";
import { z } from "zod";
import { emailService } from "./email";

// Setup session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
  }
});

// Setup passport
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Setup file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, JPG, and DOCX files are allowed.'));
    }
  }
});

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Middleware to check role
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }

  // Initialize with default admin user if none exists
  try {
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      await storage.createUser({
        employeeId: 'EMP001',
        username: 'admin',
        password: 'Admin@123',
        name: 'Administrator',
        email: 'admin@company.com',
        role: 'admin',
        department: 'IT',
        designation: 'System Administrator',
        mobile: '+1234567890'
      });

      // Create some sample users for testing
      await storage.createUser({
        employeeId: 'EMP002',
        username: 'john.smith',
        password: 'password123',
        name: 'John Smith',
        email: 'john.smith@company.com',
        role: 'user',
        department: 'IT',
        designation: 'Support Agent',
        mobile: '+1234567891'
      });

      await storage.createUser({
        employeeId: 'EMP003',
        username: 'sarah.johnson',
        password: 'password123',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        role: 'user',
        department: 'IT',
        designation: 'Support Agent',
        mobile: '+1234567892'
      });

      await storage.createUser({
        employeeId: 'EMP004',
        username: 'michael.chen',
        password: 'password123',
        name: 'Michael Chen',
        email: 'michael.chen@company.com',
        role: 'user',
        department: 'HR',
        designation: 'HR Specialist',
        mobile: '+1234567893'
      });
    }
  } catch (error) {
    console.error('Error initializing default users:', error);
  }

  // Authentication routes
  app.post('/api/auth/login', passport.authenticate('local'), (req: any, res) => {
    res.json({ 
      user: {
        id: req.user.id,
        employeeId: req.user.employeeId,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        mobile: req.user.mobile,
        department: req.user.department,
        designation: req.user.designation,
        role: req.user.role
      }
    });
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', requireAuth, (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        employeeId: req.user.employeeId,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        mobile: req.user.mobile,
        department: req.user.department,
        designation: req.user.designation,
        role: req.user.role
      }
    });
  });

  // User management routes
  app.get('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => ({
        id: user.id,
        employeeId: user.employeeId,
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        designation: user.designation,
        role: user.role,
        createdAt: user.createdAt
      }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const safeUser = {
        id: user.id,
        employeeId: user.employeeId,
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        designation: user.designation,
        role: user.role,
        createdAt: user.createdAt
      };
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Bulk user creation
  app.post('/api/users/bulk', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { users: usersData } = req.body;
      
      if (!Array.isArray(usersData) || usersData.length === 0) {
        return res.status(400).json({ message: 'Users array is required and cannot be empty' });
      }

      const results = [];
      const errors = [];
      
      for (let i = 0; i < usersData.length; i++) {
        try {
          const userData = insertUserSchema.parse(usersData[i]);
          const user = await storage.createUser(userData);
          results.push({
            success: true,
            user: {
              id: user.id,
              employeeId: user.employeeId,
              username: user.username,
              name: user.name,
              email: user.email,
              mobile: user.mobile,
              department: user.department,
              designation: user.designation,
              role: user.role
            }
          });
        } catch (error) {
          errors.push({
            index: i,
            data: usersData[i],
            error: error instanceof z.ZodError ? error.errors : 'Failed to create user'
          });
        }
      }

      res.status(201).json({
        message: `Created ${results.length} users, ${errors.length} errors`,
        results,
        errors
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to process bulk user creation' });
    }
  });

  // Get single user
  app.get('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const safeUser = {
        id: user.id,
        employeeId: user.employeeId,
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        designation: user.designation,
        role: user.role,
        createdAt: user.createdAt
      };
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user
  app.put('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updateData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, updateData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const safeUser = {
        id: user.id,
        employeeId: user.employeeId,
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        designation: user.designation,
        role: user.role,
        createdAt: user.createdAt
      };
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Reset user password
  app.put('/api/users/:id/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user with new password
      const updatedUser = await storage.updateUser(req.params.id, { password });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Delete user
  app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Prevent deleting own account
      if (userId === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Bulk delete users
  app.delete('/api/users/bulk', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { employeeIds } = req.body;
      
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: 'Employee IDs array is required' });
      }

      const results = { deleted: 0, notFound: [] as string[] };
      
      for (const employeeId of employeeIds) {
        try {
          // Find user by employee ID
          const user = await storage.getUserByEmployeeId(employeeId);
          if (!user) {
            results.notFound.push(employeeId);
            continue;
          }

          // Prevent deleting own account
          if (user.id === req.user.id) {
            results.notFound.push(`${employeeId} (cannot delete own account)`);
            continue;
          }

          // Delete the user
          const success = await storage.deleteUser(user.id);
          if (success) {
            results.deleted++;
          } else {
            results.notFound.push(employeeId);
          }
        } catch (error) {
          results.notFound.push(employeeId);
        }
      }

      res.json({
        message: `Deleted ${results.deleted} users, ${results.notFound.length} not found`,
        deleted: results.deleted,
        notFound: results.notFound
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete users' });
    }
  });

  // Ticket routes
  app.get('/api/tickets', requireAuth, async (req: any, res) => {
    try {
      const filters: any = {};
      
      // Role-based filtering
      if (req.user.role === 'user') {
        filters.createdById = req.user.id;
      } else if (req.user.role === 'viewer') {
        // Viewers can see all tickets but with read-only access
      }
      // Admin can see all tickets (no additional filtering)

      // Apply query parameters
      if (req.query.status) filters.status = req.query.status;
      if (req.query.priority) filters.priority = req.query.priority;
      if (req.query.department) filters.department = req.query.department;
      if (req.query.search) filters.search = req.query.search;
      if (req.query.page) filters.page = parseInt(req.query.page);
      if (req.query.limit) filters.limit = parseInt(req.query.limit);

      const result = await storage.getTickets(filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  });

  app.get('/api/tickets/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getTicketStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch ticket stats' });
    }
  });

  app.get('/api/tickets/:id', requireAuth, async (req: any, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check permissions
      if (req.user.role === 'employee' && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get related data
      const [comments, attachments] = await Promise.all([
        storage.getTicketComments(ticket.id),
        storage.getTicketAttachments(ticket.id)
      ]);

      res.json({ ticket, comments, attachments });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch ticket' });
    }
  });

  app.post('/api/tickets', requireAuth, upload.array('attachments'), async (req: any, res) => {
    try {
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        createdById: req.user.id
      });

      const ticket = await storage.createTicket(ticketData);

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const filename = randomUUID() + path.extname(file.originalname);
          const filepath = path.join('uploads', filename);
          
          fs.renameSync(file.path, filepath);

          await storage.createAttachment({
            ticketId: ticket.id,
            filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedById: req.user.id
          });
        }
      }

      // Create audit log
      await storage.createAuditLog({
        ticketId: ticket.id,
        userId: req.user.id,
        action: 'created',
        newValue: ticket.status
      });

      // Send email notifications asynchronously
      console.log(`Attempting to send ticket created email to: ${ticket.employeeEmail}`);
      emailService.sendTicketCreatedEmail(ticket, ticket.employeeEmail).catch(error => {
        console.error('❌ Failed to send ticket created email:', error);
        console.error('❌ Error details:', error.message);
      });

      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid ticket data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create ticket' });
    }
  });

  app.patch('/api/tickets/:id', requireAuth, async (req: any, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check permissions
      if (req.user.role === 'employee' && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const oldStatus = ticket.status;
      const updatedTicket = await storage.updateTicket(req.params.id, req.body);

      if (updatedTicket && req.body.status && req.body.status !== oldStatus) {
        // Create audit log for status change
        await storage.createAuditLog({
          ticketId: updatedTicket.id,
          userId: req.user.id,
          action: 'status_changed',
          oldValue: oldStatus,
          newValue: req.body.status
        });

        // Send status update email notification
        console.log(`Sending status update email for ticket ${updatedTicket.ticketNumber}: ${oldStatus} → ${req.body.status}`);
        emailService.sendStatusUpdateEmail(
          updatedTicket, 
          oldStatus, 
          req.body.status, 
          req.user.username || req.user.email
        ).catch(error => {
          console.error('❌ Failed to send status update email:', error);
        });
      }

      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update ticket' });
    }
  });

  app.delete('/api/tickets/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const success = await storage.deleteTicket(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete ticket' });
    }
  });

  // Settings routes
  app.get('/api/settings', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { category } = req.query;
      const settings = await storage.getSettings(category as string);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve settings' });
    }
  });

  app.get('/api/settings/:key', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve setting' });
    }
  });

  app.post('/api/settings', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const settingData = insertSettingSchema.parse(req.body);
      const setting = await storage.setSetting(settingData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid setting data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to save setting' });
    }
  });

  app.put('/api/settings/:key', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { value } = req.body;
      if (!value) {
        return res.status(400).json({ message: 'Value is required' });
      }

      const setting = await storage.updateSetting(req.params.key, value);
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update setting' });
    }
  });

  app.post('/api/settings/bulk', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { settings } = req.body;
      if (!Array.isArray(settings)) {
        return res.status(400).json({ message: 'Settings must be an array' });
      }

      const savedSettings = [];
      for (const settingData of settings) {
        const validatedSetting = insertSettingSchema.parse(settingData);
        const setting = await storage.setSetting(validatedSetting);
        savedSettings.push(setting);
      }

      res.status(201).json(savedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to save settings' });
    }
  });

  app.post('/api/settings/test-email', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { email, settings } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }

      // Validate email format
      const emailSchema = z.string().email();
      const validatedEmail = emailSchema.parse(email);

      // Use provided settings if available, otherwise use stored settings
      let testSettings = null;
      if (settings) {
        testSettings = {
          enabled: true,
          host: settings.smtpHost,
          port: parseInt(settings.smtpPort || '587'),
          username: settings.smtpUsername,
          password: settings.smtpPassword,
          senderName: settings.senderName || 'IT Support Team',
          senderEmail: settings.senderEmail,
          itTeamEmail: settings.itTeamEmail
        };
      }

      await emailService.sendTestEmail(validatedEmail, testSettings);
      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid email address' });
      }
      res.status(500).json({ 
        message: 'Failed to send test email', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Comment routes
  app.post('/api/tickets/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      const commentData = insertCommentSchema.parse({
        ...req.body,
        ticketId: req.params.id,
        userId: req.user.id
      });

      const comment = await storage.createComment(commentData);

      // Create audit log
      await storage.createAuditLog({
        ticketId: req.params.id,
        userId: req.user.id,
        action: 'comment_added',
        newValue: req.body.content
      });

      // Send comment notification email
      console.log(`Sending comment notification email for ticket ${ticket.ticketNumber}`);
      emailService.sendCommentAddedEmail(
        ticket, 
        comment, 
        req.user.username || req.user.email
      ).catch(error => {
        console.error('❌ Failed to send comment notification email:', error);
      });

      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid comment data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  // File download route
  app.get('/api/attachments/:id/download', requireAuth, async (req, res) => {
    try {
      const attachment = await storage.getAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      const filepath = path.join('uploads', attachment.filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.setHeader('Content-Type', attachment.mimeType);
      
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({ message: 'Failed to download file' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
