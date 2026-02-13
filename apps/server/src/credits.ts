/**
 * Credit management system
 */

import { prisma } from "./db";
import { CREDIT_CONSTANTS } from "@graffiti/shared";

// In-memory store for users with infinite credits (cheat code)
const infiniteCreditsUsers = new Set<string>();

/**
 * Get or create user credits record
 */
export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.upsert({
    where: { userId },
    create: {
      userId,
      credits: CREDIT_CONSTANTS.STARTING_CREDITS,
    },
    update: {},
  });

  return user.credits;
}

/**
 * Spend credits for a stroke chunk
 * Returns true if successful, false if insufficient credits
 */
export async function spendCredits(userId: string, points: number): Promise<boolean> {
  // Check if user has infinite credits
  if (infiniteCreditsUsers.has(userId)) {
    return true; // Always allow for infinite credits users
  }

  const cost = points * CREDIT_CONSTANTS.COST_PER_POINT;
  
  // Get current credits
  const user = await prisma.user.findUnique({
    where: { userId },
  });

  if (!user) {
    // Create user if doesn't exist
    await prisma.user.create({
      data: {
        userId,
        credits: CREDIT_CONSTANTS.STARTING_CREDITS,
      },
    });
    return false; // Need to retry
  }

  if (user.credits < cost) {
    return false;
  }

  // Deduct credits
  await prisma.user.update({
    where: { userId },
    data: {
      credits: {
        decrement: cost,
      },
    },
  });

  return true;
}

/**
 * Add earned credits based on time elapsed (gradual earning)
 * Returns the new credit balance
 */
export async function addEarnedCredits(userId: string, secondsElapsed: number): Promise<number> {
  // Calculate credits earned based on time
  const creditsEarned = Math.floor(secondsElapsed * CREDIT_CONSTANTS.EARN_RATE_PER_SECOND);
  
  if (creditsEarned <= 0) {
    // No credits to add, just return current balance
    return await getCurrentCredits(userId);
  }

  const user = await prisma.user.upsert({
    where: { userId },
    create: {
      userId,
      credits: CREDIT_CONSTANTS.STARTING_CREDITS + creditsEarned,
    },
    update: {
      credits: {
        increment: creditsEarned,
      },
    },
  });

  return user.credits;
}

/**
 * Get current credits for a user
 */
export async function getCurrentCredits(userId: string): Promise<number> {
  // Check if user has infinite credits
  if (infiniteCreditsUsers.has(userId)) {
    return Infinity;
  }

  const user = await prisma.user.findUnique({
    where: { userId },
  });

  if (!user) {
    return CREDIT_CONSTANTS.STARTING_CREDITS;
  }

  return user.credits;
}

/**
 * Check if user has infinite credits
 */
export function hasInfiniteCredits(userId: string): boolean {
  return infiniteCreditsUsers.has(userId);
}

/**
 * Grant infinite credits to a user (cheat code)
 */
export function grantInfiniteCredits(userId: string): void {
  infiniteCreditsUsers.add(userId);
}

