import { useCallback, useEffect } from 'react';
import React from 'react';
import { useLocation } from 'wouter';

interface ActivityData {
  action: string;
  resource?: string;
  element?: string;
  details?: Record<string, any>;
}

export function useActivityTracker() {
  const [location] = useLocation();

  const trackActivity = useCallback(async (data: ActivityData) => {
    try {
      // Send activity data to backend logging endpoint
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: data.action,
          resource: data.resource || getCurrentPage(location),
          details: JSON.stringify({
            element: data.element,
            page: location,
            timestamp: new Date().toISOString(),
            ...data.details
          })
        }),
      });
    } catch (error) {
      // Silently fail - don't break the user experience
      console.warn('Failed to track activity:', error);
    }
  }, [location]);

  // Track page views automatically
  const trackPageView = useCallback(() => {
    trackActivity({
      action: 'page_view',
      resource: getCurrentPage(location)
    });
  }, [location, trackActivity]);

  // Track button/link clicks
  const trackClick = useCallback((element: string, details?: Record<string, any>) => {
    trackActivity({
      action: 'click',
      element,
      details
    });
  }, [trackActivity]);

  // Track form submissions
  const trackFormSubmit = useCallback((formName: string, success: boolean = true, details?: Record<string, any>) => {
    trackActivity({
      action: 'form_submit',
      resource: formName,
      details: {
        success,
        ...details
      }
    });
  }, [trackActivity]);

  // Track search actions
  const trackSearch = useCallback((query: string, results?: number) => {
    trackActivity({
      action: 'search',
      details: {
        query,
        results
      }
    });
  }, [trackActivity]);

  // Track file uploads
  const trackFileUpload = useCallback((fileName: string, fileSize: number, success: boolean = true) => {
    trackActivity({
      action: 'file_upload',
      details: {
        fileName,
        fileSize,
        success
      }
    });
  }, [trackActivity]);

  // Track navigation
  const trackNavigation = useCallback((from: string, to: string) => {
    trackActivity({
      action: 'navigation',
      details: {
        from,
        to
      }
    });
  }, [trackActivity]);

  return {
    trackActivity,
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackFileUpload,
    trackNavigation
  };
}

function getCurrentPage(location: string): string {
  const pathMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/tickets': 'tickets',
    '/create-ticket': 'create-ticket',
    '/reports': 'reports',
    '/user-management': 'user-management',
    '/settings': 'settings'
  };

  if (location.startsWith('/tickets/') && location !== '/tickets') {
    return 'ticket-detail';
  }

  return pathMap[location] || 'unknown';
}

// Helper function to track page views - to be called from components
export function usePageViewTracking() {
  const { trackPageView } = useActivityTracker();
  
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);
}