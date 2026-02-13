/**
 * LocalStorage utilities for userId persistence
 */

import { generateUUID } from "@graffiti/shared";

const USER_ID_KEY = "graffiti_user_id";

export function getUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

