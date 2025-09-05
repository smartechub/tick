import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

interface ActivityLogData {
  userId?: string;
  sessionId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  userAgent?: string;
  ipAddress?: string;
  details?: string;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
}

export class ActivityLogger {
  private static async logActivity(data: ActivityLogData): Promise<void> {
    try {
      await storage.createActivityLog({
        userId: data.userId || null,
        sessionId: data.sessionId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        method: data.method,
        endpoint: data.endpoint,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        details: data.details,
        success: data.success || true,
        errorMessage: data.errorMessage,
        duration: data.duration
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging shouldn't break the application
    }
  }

  // Middleware for comprehensive API logging
  static apiLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody: any;
    let isError = false;

    // Capture response data
    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Extract user information
      const user = (req as any).user;
      const sessionId = (req as any).sessionID;
      
      // Extract resource information from endpoint
      const endpoint = req.originalUrl || req.url;
      const resource = ActivityLogger.extractResource(endpoint);
      const resourceId = ActivityLogger.extractResourceId(endpoint, req.params);
      
      // Get client information
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Prepare details object
      const details = {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        response: success ? undefined : responseBody, // Only log response on errors
        statusCode: res.statusCode
      };

      await ActivityLogger.logActivity({
        userId: user?.id,
        sessionId,
        action: 'api_call',
        resource,
        resourceId,
        method: req.method,
        endpoint,
        userAgent,
        ipAddress,
        details: JSON.stringify(details),
        success,
        errorMessage: success ? undefined : (responseBody?.message || 'Request failed'),
        duration
      });
    });

    next();
  };

  // Helper methods
  private static extractResource(endpoint: string): string | undefined {
    const apiPath = endpoint.replace('/api/', '');
    const segments = apiPath.split('/');
    return segments[0] || undefined;
  }

  private static extractResourceId(endpoint: string, params: any): string | undefined {
    // Look for UUID patterns in params or endpoint
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    
    // Check params first
    for (const value of Object.values(params)) {
      if (typeof value === 'string' && uuidRegex.test(value)) {
        return value;
      }
    }
    
    // Check endpoint
    const match = endpoint.match(uuidRegex);
    return match ? match[0] : undefined;
  }

  // Static methods for manual logging
  static async logLogin(userId: string, sessionId: string, userAgent?: string, ipAddress?: string, success: boolean = true, errorMessage?: string) {
    await ActivityLogger.logActivity({
      userId,
      sessionId,
      action: 'login',
      userAgent,
      ipAddress,
      success,
      errorMessage
    });
  }

  static async logLogout(userId: string, sessionId: string, userAgent?: string, ipAddress?: string) {
    await ActivityLogger.logActivity({
      userId,
      sessionId,
      action: 'logout',
      userAgent,
      ipAddress
    });
  }

  static async logPageView(userId: string, sessionId: string, page: string, userAgent?: string, ipAddress?: string) {
    await ActivityLogger.logActivity({
      userId,
      sessionId,
      action: 'page_view',
      resource: page,
      userAgent,
      ipAddress
    });
  }

  static async logClick(userId: string, sessionId: string, element: string, page?: string, details?: any, userAgent?: string, ipAddress?: string) {
    await ActivityLogger.logActivity({
      userId,
      sessionId,
      action: 'click',
      resource: page,
      details: JSON.stringify({
        element,
        ...details
      }),
      userAgent,
      ipAddress
    });
  }

  static async logFormSubmit(userId: string, sessionId: string, formName: string, success: boolean = true, errorMessage?: string, userAgent?: string, ipAddress?: string) {
    await ActivityLogger.logActivity({
      userId,
      sessionId,
      action: 'form_submit',
      resource: formName,
      success,
      errorMessage,
      userAgent,
      ipAddress
    });
  }
}