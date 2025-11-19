'use client';

import { useState, useEffect, useCallback } from 'react';

// Cache for view-only status to avoid repeated API calls
let viewOnlyCache = {
  eventId: null,
  status: null,
  timestamp: null,
};

const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Check if the working event has passed its end date
 * @param {string|number} eventId - The event ID to check
 * @returns {Promise<boolean>} - True if event has passed (view-only mode)
 */
export async function isViewOnlyMode(eventId = null) {
  try {
    // Get working event ID from localStorage if not provided
    if (!eventId && typeof window !== 'undefined') {
      eventId = localStorage.getItem('workingEventId');
    }

    if (!eventId) {
      return false; // No working event, not in view-only mode
    }

    // Check cache first
    const now = Date.now();
    if (
      viewOnlyCache.eventId === eventId &&
      viewOnlyCache.timestamp &&
      now - viewOnlyCache.timestamp < CACHE_DURATION
    ) {
      return viewOnlyCache.status;
    }

    // Fetch event details
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      console.error('Failed to fetch event for view-only check');
      return false; // Default to not view-only on error
    }

    const event = await response.json();
    if (event.error || !event.end_date) {
      return false;
    }

    // Compare end_date with current date (date only, ignore time)
    const endDate = new Date(event.end_date);
    endDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isViewOnly = endDate < today;

    // Update cache
    viewOnlyCache = {
      eventId: eventId.toString(),
      status: isViewOnly,
      timestamp: now,
    };

    return isViewOnly;
  } catch (error) {
    console.error('Error checking view-only mode:', error);
    return false; // Default to not view-only on error
  }
}

/**
 * Clear the view-only cache (useful when event changes)
 */
export function clearViewOnlyCache() {
  viewOnlyCache = {
    eventId: null,
    status: null,
    timestamp: null,
  };
}

/**
 * React hook to check view-only mode
 * @returns {boolean} - True if in view-only mode
 */
export function useViewOnlyMode() {
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkViewOnly = useCallback(async () => {
    setIsLoading(true);
    const status = await isViewOnlyMode();
    setIsViewOnly(status);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkViewOnly();

    // Listen for working event changes
    const handleWorkingEventChange = () => {
      clearViewOnlyCache();
      checkViewOnly();
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, [checkViewOnly]);

  return { isViewOnly, isLoading };
}

