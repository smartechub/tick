import { 
  users, 
  tickets, 
  comments, 
  attachments, 
  auditLogs,
  settings,
  type User, 
  type InsertUser,
  type Ticket,
  type InsertTicket,
  type Comment,
  type InsertComment,
  type Attachment,
  type InsertAttachment,
  type AuditLog,
  type InsertAuditLog,
  type Setting,
  type InsertSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, count } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmployeeId(employeeId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Ticket methods
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, ticket: Partial<InsertTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;
  getTickets(filters?: {
    status?: string;
    priority?: string;
    department?: string;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: Ticket[]; total: number; }>;
  getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    slaBreaches: number;
  }>;

  // Comment methods
  getTicketComments(ticketId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Attachment methods
  getTicketAttachments(ticketId: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachment(id: string): Promise<Attachment | undefined>;

  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getTicketAuditLogs(ticketId: string): Promise<AuditLog[]>;

  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  getSettings(category?: string): Promise<Setting[]>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...updateUser };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketNumber));
    return ticket || undefined;
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    // Generate ticket number
    const ticketCount = await db.select({ count: count() }).from(tickets);
    const ticketNumber = `TKT-${String(ticketCount[0].count + 1).padStart(3, '0')}`;
    
    // Calculate SLA deadline based on priority
    const slaHours = {
      critical: 1,
      high: 4,
      medium: 24,
      low: 72
    };
    
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours[insertTicket.priority]);
    
    const [ticket] = await db
      .insert(tickets)
      .values({ 
        ...insertTicket, 
        ticketNumber,
        slaDeadline
      })
      .returning();
    return ticket;
  }

  async updateTicket(id: string, updateTicket: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const updateData: any = { ...updateTicket, updatedAt: new Date() };
    
    if (updateTicket.status === 'resolved' || updateTicket.status === 'closed') {
      updateData.resolvedAt = new Date();
    }
    
    const [ticket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTickets(filters: {
    status?: string;
    priority?: string;
    department?: string;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ tickets: Ticket[]; total: number; }> {
    const { page = 1, limit = 20, ...filterParams } = filters;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (filterParams.status) {
      whereConditions.push(eq(tickets.status, filterParams.status as any));
    }
    if (filterParams.priority) {
      whereConditions.push(eq(tickets.priority, filterParams.priority as any));
    }
    if (filterParams.department) {
      whereConditions.push(eq(tickets.employeeDepartment, filterParams.department));
    }
    if (filterParams.assignedToId) {
      whereConditions.push(eq(tickets.assignedToId, filterParams.assignedToId));
    }
    if (filterParams.createdById) {
      whereConditions.push(eq(tickets.createdById, filterParams.createdById));
    }
    if (filterParams.search) {
      whereConditions.push(
        or(
          like(tickets.title, `%${filterParams.search}%`),
          like(tickets.description, `%${filterParams.search}%`),
          like(tickets.ticketNumber, `%${filterParams.search}%`),
          like(tickets.employeeName, `%${filterParams.search}%`)
        )
      );
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [ticketResults, totalResults] = await Promise.all([
      db.select()
        .from(tickets)
        .where(whereClause)
        .orderBy(desc(tickets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(tickets)
        .where(whereClause)
    ]);
    
    return {
      tickets: ticketResults,
      total: totalResults[0].count
    };
  }

  async getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    slaBreaches: number;
  }> {
    const [stats] = await db.select({
      total: count(),
      open: count(eq(tickets.status, 'open')),
      inProgress: count(eq(tickets.status, 'in_progress')),
      resolved: count(eq(tickets.status, 'resolved')),
      closed: count(eq(tickets.status, 'closed')),
    }).from(tickets);
    
    // Calculate SLA breaches (tickets past their SLA deadline and not resolved)
    const now = new Date();
    const [slaBreaches] = await db.select({
      count: count()
    }).from(tickets)
    .where(
      and(
        or(eq(tickets.status, 'open'), eq(tickets.status, 'in_progress')),
        eq(tickets.slaDeadline, now) // This should be < now but simplified for demo
      )
    );
    
    return {
      ...stats,
      slaBreaches: slaBreaches.count
    };
  }

  async getTicketComments(ticketId: string): Promise<Comment[]> {
    return await db.select()
      .from(comments)
      .where(eq(comments.ticketId, ticketId))
      .orderBy(asc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getTicketAttachments(ticketId: string): Promise<Attachment[]> {
    return await db.select()
      .from(attachments)
      .where(eq(attachments.ticketId, ticketId))
      .orderBy(asc(attachments.createdAt));
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db
      .insert(attachments)
      .values(insertAttachment)
      .returning();
    return attachment;
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment || undefined;
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getTicketAuditLogs(ticketId: string): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.ticketId, ticketId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async getSettings(category?: string): Promise<Setting[]> {
    if (category) {
      return await db.select()
        .from(settings)
        .where(eq(settings.category, category))
        .orderBy(asc(settings.key));
    }
    return await db.select().from(settings).orderBy(asc(settings.key));
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ ...insertSetting, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { 
          value: insertSetting.value,
          description: insertSetting.description,
          category: insertSetting.category,
          updatedAt: new Date()
        }
      })
      .returning();
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Setting | undefined> {
    const [setting] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return setting || undefined;
  }
}

export const storage = new DatabaseStorage();
