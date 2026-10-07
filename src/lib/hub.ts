import type { User } from "@supabase/supabase-js";

export type HubApp = {
  id: string;
  name: string;
  kind: string;
  icon: string;
  color: string;
  urls: string[];
  html: string | null;
};

export const ADMIN_EMAIL = "corniestc@gmail.com";
export const ADMIN_NAME = "minh";

export function isAdmin(user: User | null | undefined) {
  if (!user) return false;
  const name = String(user.user_metadata?.['name'] ?? "").trim().toLowerCase();
  return user.email?.toLowerCase() === ADMIN_EMAIL && name === ADMIN_NAME;
}

export const CHAT_URL = "https://immlad.github.io/liquid-aura/";
