/**
 * Rate limiting for WebSocket connections
 */

import { RATE_LIMIT } from "@graffiti/shared";

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitState>();

/**
 * Check if a connection is rate limited
 * Returns true if allowed, false if rate limited
 */
export function checkRateLimit(connectionId: string): boolean {
  const now = Date.now();
  const state = rateLimitMap.get(connectionId);

  if (!state || now > state.resetAt) {
    // Reset or initialize
    rateLimitMap.set(connectionId, {
      count: 1,
      resetAt: now + 1000, // Reset every second
    });
    return true;
  }

  if (state.count >= RATE_LIMIT.MAX_STROKES_PER_SECOND) {
    return false;
  }

  state.count++;
  return true;
}

/**
 * Clean up rate limit state for a connection
 */
export function cleanupRateLimit(connectionId: string): void {
  rateLimitMap.delete(connectionId);
}

